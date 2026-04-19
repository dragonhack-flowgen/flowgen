from __future__ import annotations

import asyncio
import json
import os
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from mimetypes import guess_type
from pathlib import Path
from typing import Any, Callable, Literal
from uuid import uuid4

import requests
from browser_use import Agent, BrowserProfile
from browser_use.agent.views import AgentHistory, AgentHistoryList
from browser_use.browser.profile import ViewportSize
from browser_use.llm.azure.chat import ChatAzureOpenAI
from browser_use.llm.browser_use.chat import ChatBrowserUse
from browser_use.llm.google.chat import ChatGoogle
from browser_use.llm.models import get_llm_by_name
from browser_use.llm.openai.chat import ChatOpenAI
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    return float(value) if value not in (None, "") else default


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    return int(value) if value not in (None, "") else default


def env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def env_optional(name: str) -> str | None:
    value = os.getenv(name)
    return value if value not in (None, "") else None


def utc_now() -> datetime:
    return datetime.now(UTC)


def isoformat_utc(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


@dataclass
class RunPaths:
    task_dir: Path
    raw_dir: Path
    conversations_dir: Path
    step_traces_dir: Path
    manifest_path: Path
    history_path: Path
    status_path: Path


class RecordingRunRequest(BaseModel):
    task_id: str | None = Field(default=None, alias="taskId")
    task: str

    model_config = {"populate_by_name": True}


RecordingState = Literal["queued", "running", "completed", "failed"]


class RecordingTimelineStepModel(BaseModel):
    step_number: int = Field(alias="stepNumber")
    captured_at: str = Field(alias="capturedAt")
    type: str
    summary: str
    screenshot_url: str | None = Field(default=None, alias="screenshotUrl")

    model_config = {"populate_by_name": True}


class RecordingManifestModel(BaseModel):
    task_id: str = Field(alias="taskId")
    task: str
    provider: str
    session_id: str = Field(alias="sessionId")
    started_at: str = Field(alias="startedAt")
    ended_at: str = Field(alias="endedAt")
    step_count: int = Field(alias="stepCount")
    last_step_summary: str | None = Field(default=None, alias="lastStepSummary")
    steps: list[RecordingTimelineStepModel]

    model_config = {"populate_by_name": True}


class RecordingArtifactsModel(BaseModel):
    provider: str | None
    acl: str | None
    file_key: str | None = Field(default=None, alias="fileKey")
    upload_url: str | None = Field(default=None, alias="uploadUrl")
    local_path: str | None = Field(default=None, alias="localPath")
    error: str | None = None

    model_config = {"populate_by_name": True}


class RecordingRunResponse(BaseModel):
    provider_task_id: str = Field(alias="providerTaskId")
    manifest: RecordingManifestModel
    artifacts: RecordingArtifactsModel
    task_dir: str = Field(alias="taskDir")
    history_path: str | None = Field(default=None, alias="historyPath")
    raw_video_path: str | None = Field(default=None, alias="rawVideoPath")

    model_config = {"populate_by_name": True}


class RecordingStatusModel(BaseModel):
    task_id: str = Field(alias="taskId")
    session_id: str = Field(alias="sessionId")
    task: str
    status: RecordingState
    started_at: str | None = Field(default=None, alias="startedAt")
    ended_at: str | None = Field(default=None, alias="endedAt")
    current_step_number: int = Field(default=0, alias="currentStepNumber")
    step_count: int = Field(default=0, alias="stepCount")
    current_url: str | None = Field(default=None, alias="currentUrl")
    current_title: str | None = Field(default=None, alias="currentTitle")
    error: str | None = None
    is_active: bool = Field(default=False, alias="isActive")
    manifest: RecordingManifestModel | None = None
    artifacts: RecordingArtifactsModel | None = None
    task_dir: str | None = Field(default=None, alias="taskDir")
    history_path: str | None = Field(default=None, alias="historyPath")
    raw_video_path: str | None = Field(default=None, alias="rawVideoPath")

    model_config = {"populate_by_name": True}


class RecordingStartResponse(BaseModel):
    task_id: str = Field(alias="taskId")
    session_id: str = Field(alias="sessionId")
    status: RecordingState
    started_at: str = Field(alias="startedAt")
    status_url: str = Field(alias="statusUrl")
    task: str

    model_config = {"populate_by_name": True}


class StepCollector:
    def __init__(
        self,
        step_traces_dir: Path,
        on_step: Callable[[int, dict[str, Any]], None] | None = None,
    ) -> None:
        self.step_traces_dir = step_traces_dir
        self.planned_steps: dict[int, dict[str, Any]] = {}
        self.on_step = on_step

    async def on_new_step(
        self, browser_state_summary: Any, agent_output: Any, step_number: int
    ) -> None:
        actions = [
            action.model_dump(exclude_none=True, mode="json")
            for action in getattr(agent_output, "action", [])
        ]
        page_info = getattr(browser_state_summary, "page_info", None)
        trace_payload = {
            "step_number": step_number,
            "captured_at": time.time(),
            "url": getattr(browser_state_summary, "url", None),
            "title": getattr(browser_state_summary, "title", None),
            "actions": actions,
            "page_info": (
                {
                    "viewport_width": getattr(page_info, "viewport_width", None),
                    "viewport_height": getattr(page_info, "viewport_height", None),
                    "scroll_x": getattr(page_info, "scroll_x", None),
                    "scroll_y": getattr(page_info, "scroll_y", None),
                }
                if page_info
                else None
            ),
        }
        self.planned_steps[step_number] = trace_payload
        target = self.step_traces_dir / f"step_{step_number:03d}.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("w", encoding="utf-8") as handle:
            json.dump(trace_payload, handle, indent=2, ensure_ascii=False)
        if self.on_step is not None:
            self.on_step(step_number, trace_payload)


def build_model_from_env(prefix: str, default_provider: str) -> Any:
    provider = env_str(f"{prefix}_MODEL_PROVIDER", default_provider).strip().lower()
    model = os.getenv(f"{prefix}_MODEL", "").strip()

    if (
        model
        and "_" in model
        and model.split("_", 1)[0]
        in {"openai", "azure", "google", "mistral", "cerebras", "bu"}
    ):
        return get_llm_by_name(model)

    if provider == "openai":
        return ChatOpenAI(
            model=model or "gpt-4.1-mini",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.0,
        )
    if provider in {"browser_use", "browser-use", "bu"}:
        return ChatBrowserUse(
            model=model or "bu-latest",
            api_key=os.getenv("BROWSER_USE_API_KEY"),
        )
    if provider == "google":
        return ChatGoogle(
            model=model or "gemini-2.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY"),
        )
    if provider == "azure":
        return ChatAzureOpenAI(
            model=model or "gpt-4.1-mini",
            api_key=os.getenv("AZURE_OPENAI_KEY") or os.getenv("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        )

    raise ValueError(f"Unsupported {prefix}_MODEL_PROVIDER: {provider}")


def build_llm() -> Any:
    return build_model_from_env("BROWSER_USE", default_provider="browser_use")


def build_fallback_llm(primary_llm: Any) -> Any | None:
    fallback_provider = os.getenv("BROWSER_USE_FALLBACK_MODEL_PROVIDER", "").strip()
    fallback_model = os.getenv("BROWSER_USE_FALLBACK_MODEL", "").strip()
    if fallback_provider or fallback_model:
        return build_model_from_env("BROWSER_USE_FALLBACK", default_provider="openai")

    primary_provider = getattr(primary_llm, "provider", "")
    primary_model = str(getattr(primary_llm, "model", "") or "")
    if primary_provider == "openai" and primary_model != "gpt-4.1-mini":
        return ChatOpenAI(
            model="gpt-4.1-mini",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.0,
        )

    return None


def make_run_paths(task_id: str, create_dirs: bool = True) -> RunPaths:
    task_root = Path(env_str("BROWSER_USE_TASK_RECORDS_DIR", "task_records"))
    conversations_root = Path(env_str("BROWSER_USE_CONVERSATIONS_DIR", "conversations"))
    step_traces_root = Path(env_str("BROWSER_USE_STEP_TRACES_DIR", "step_traces"))

    root = task_root / task_id
    raw_dir = root / "raw"
    conversations_dir = conversations_root / task_id
    step_traces_dir = step_traces_root / task_id

    if create_dirs:
        for directory in (root, raw_dir, conversations_dir, step_traces_dir):
            directory.mkdir(parents=True, exist_ok=True)

    return RunPaths(
        task_dir=root,
        raw_dir=raw_dir,
        conversations_dir=conversations_dir,
        step_traces_dir=step_traces_dir,
        manifest_path=root / "task_record.json",
        history_path=root / "agent_history.json",
        status_path=root / "status.json",
    )


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def get_task_root() -> Path:
    return Path(env_str("BROWSER_USE_TASK_RECORDS_DIR", "task_records"))


RUNNING_RECORDINGS: dict[str, asyncio.Task[None]] = {}


def consume_background_task_result(task: asyncio.Task[None]) -> None:
    try:
        task.result()
    except Exception:
        import logging
        logging.getLogger("recorder").exception("Recording job failed")
        pass


def persist_status(
    paths: RunPaths,
    *,
    task_id: str,
    task: str,
    status: RecordingState,
    started_at: datetime | None = None,
    ended_at: datetime | None = None,
    current_step_number: int = 0,
    step_count: int = 0,
    current_url: str | None = None,
    current_title: str | None = None,
    error: str | None = None,
    manifest: RecordingManifestModel | None = None,
    artifacts: RecordingArtifactsModel | None = None,
    history_path: Path | None = None,
    raw_video_path: Path | None = None,
) -> RecordingStatusModel:
    payload = RecordingStatusModel(
        taskId=task_id,
        sessionId=task_id,
        task=task,
        status=status,
        startedAt=isoformat_utc(started_at) if started_at else None,
        endedAt=isoformat_utc(ended_at) if ended_at else None,
        currentStepNumber=current_step_number,
        stepCount=step_count,
        currentUrl=current_url,
        currentTitle=current_title,
        error=error,
        isActive=task_id in RUNNING_RECORDINGS and not RUNNING_RECORDINGS[task_id].done(),
        manifest=manifest,
        artifacts=artifacts,
        taskDir=str(paths.task_dir.resolve()),
        historyPath=str(history_path.resolve()) if history_path else None,
        rawVideoPath=str(raw_video_path.resolve()) if raw_video_path else None,
    )
    write_json(paths.status_path, payload.model_dump(mode="json", by_alias=True))
    return payload


def load_status(task_id: str) -> RecordingStatusModel | None:
    paths = make_run_paths(task_id, create_dirs=False)
    payload = read_json(paths.status_path)
    if payload is None:
        manifest_payload = read_json(paths.manifest_path)
        if manifest_payload is None:
            return None
        manifest = RecordingManifestModel.model_validate(manifest_payload)
        return RecordingStatusModel(
            taskId=task_id,
            sessionId=task_id,
            task=manifest.task,
            status="completed",
            startedAt=manifest.started_at,
            endedAt=manifest.ended_at,
            currentStepNumber=manifest.step_count,
            stepCount=manifest.step_count,
            isActive=False,
            manifest=manifest,
            taskDir=str(paths.task_dir.resolve()),
            historyPath=str(paths.history_path.resolve())
            if paths.history_path.exists()
            else None,
        )

    status = RecordingStatusModel.model_validate(payload)
    is_active = task_id in RUNNING_RECORDINGS and not RUNNING_RECORDINGS[task_id].done()
    if status.status in {"queued", "running"} and not is_active:
        status = status.model_copy(
            update={
                "is_active": False,
                "status": "failed",
                "error": status.error or "Recording process was interrupted.",
                "ended_at": isoformat_utc(utc_now()),
            }
        )
        persist_status(
            paths,
            task_id=task_id,
            task=status.task,
            status="failed",
            started_at=status.started_at,
            ended_at=utc_now(),
            current_step_number=status.current_step_number,
            step_count=status.step_count,
            current_url=status.current_url,
            current_title=status.current_title,
            error=status.error or "Recording process was interrupted.",
        )
    else:
        status = status.model_copy(update={"is_active": is_active})
    return status


def list_recordings() -> list[RecordingStatusModel]:
    task_root = get_task_root()
    if not task_root.exists():
        return []

    recordings: list[RecordingStatusModel] = []
    for candidate in task_root.iterdir():
        if not candidate.is_dir():
            continue
        status = load_status(candidate.name)
        if status is not None:
            recordings.append(status)

    recordings.sort(
        key=lambda item: item.started_at or "",
        reverse=True,
    )
    return recordings


def build_browser_profile(raw_dir: Path) -> BrowserProfile:
    width = env_int("BROWSER_USE_RECORD_VIDEO_WIDTH", 1280)
    height = env_int("BROWSER_USE_RECORD_VIDEO_HEIGHT", 720)
    fps = env_int("BROWSER_USE_RECORD_VIDEO_FPS", 30)
    record_video = env_bool("BROWSER_USE_RECORD_VIDEO", True)
    video_size = ViewportSize(width=width, height=height)
    return BrowserProfile(
        headless=env_bool("BROWSER_USE_HEADLESS", True),
        minimum_wait_page_load_time=env_float("BROWSER_USE_MIN_PAGE_LOAD_WAIT", 0.75),
        wait_for_network_idle_page_load_time=env_float(
            "BROWSER_USE_NETWORK_IDLE_WAIT", 1.25
        ),
        wait_between_actions=env_float("BROWSER_USE_WAIT_BETWEEN_ACTIONS", 0.9),
        highlight_elements=env_bool("BROWSER_USE_HIGHLIGHT_ELEMENTS", True),
        dom_highlight_elements=env_bool("BROWSER_USE_DOM_HIGHLIGHT_ELEMENTS", False),
        interaction_highlight_color=env_str(
            "BROWSER_USE_INTERACTION_HIGHLIGHT_COLOR", "rgb(255, 127, 39)"
        ),
        interaction_highlight_duration=env_float(
            "BROWSER_USE_INTERACTION_HIGHLIGHT_DURATION", 1.0
        ),
        window_size=video_size,
        record_video_dir=raw_dir if record_video else None,
        record_video_size=video_size if record_video else None,
        record_video_framerate=fps,
    )


def extract_step_number(history_item: AgentHistory, fallback_step_number: int) -> int:
    metadata = getattr(history_item, "metadata", None)
    if metadata is None:
        return fallback_step_number
    return int(getattr(metadata, "step_number", fallback_step_number))


def extract_step_timestamp(
    history_item: AgentHistory, fallback_time: datetime
) -> datetime:
    metadata = getattr(history_item, "metadata", None)
    value = getattr(metadata, "step_end_time", None) or getattr(
        metadata, "step_start_time", None
    )
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=UTC)
    return fallback_time


def extract_step_summary(
    history_item: AgentHistory, planned_step: dict[str, Any], step_number: int
) -> str:
    result_summaries = []
    for result in getattr(history_item, "result", []) or []:
        text = getattr(result, "extracted_content", None) or getattr(
            result, "message", None
        )
        if isinstance(text, str) and text.strip():
            result_summaries.append(text.strip())

    if result_summaries:
        return result_summaries[-1]

    model_output = getattr(history_item, "model_output", None)
    current_state = getattr(model_output, "current_state", None)
    evaluation = getattr(current_state, "evaluation_previous_goal", None)
    memory = getattr(current_state, "memory", None)
    next_goal = getattr(current_state, "next_goal", None)
    candidates = [evaluation, memory, next_goal, planned_step.get("title")]
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    actions = planned_step.get("actions") or []
    if actions:
        return f"Executed {len(actions)} browser action(s) during step {step_number}."

    return f"Completed step {step_number}."


def build_timeline(
    history: AgentHistoryList[Any],
    planned_steps: dict[int, dict[str, Any]],
    fallback_time: datetime,
) -> list[RecordingTimelineStepModel]:
    timeline: list[RecordingTimelineStepModel] = []
    for index, history_item in enumerate(history.history, start=1):
        step_number = extract_step_number(history_item, index)
        planned_step = planned_steps.get(step_number, {})
        captured_at = extract_step_timestamp(history_item, fallback_time)
        state = getattr(history_item, "state", None)
        screenshot_url = None
        for field_name in ("screenshot_url", "screenshotUrl"):
            value = getattr(state, field_name, None)
            if isinstance(value, str) and value.strip():
                screenshot_url = value
                break

        timeline.append(
            RecordingTimelineStepModel(
                stepNumber=step_number,
                capturedAt=isoformat_utc(captured_at),
                type="agent_step",
                summary=extract_step_summary(history_item, planned_step, step_number),
                screenshotUrl=screenshot_url,
            )
        )

    timeline.sort(key=lambda step: step.step_number)
    return timeline


def pick_raw_video(raw_dir: Path, previous_files: set[Path]) -> Path | None:
    candidates = sorted(raw_dir.glob("*.mp4"), key=lambda path: path.stat().st_mtime)
    new_files = [path for path in candidates if path not in previous_files]
    if new_files:
        return new_files[-1]
    return candidates[-1] if candidates else None


def get_storage_mode() -> str:
    return env_str("RECORDING_STORAGE_MODE", "local").strip().lower()


def get_uploadthing_acl() -> str | None:
    acl = env_optional("UPLOADTHING_ACL")
    if acl is None:
        return None
    normalized = acl.strip()
    if normalized not in {"public-read", "private"}:
        raise ValueError(f"Unsupported UPLOADTHING_ACL: {normalized}")
    return normalized


def upload_video_to_uploadthing(
    video_path: Path,
    task_id: str,
    task: str,
) -> RecordingArtifactsModel:
    backend_url = env_str("BACKEND_INTERNAL_URL", "http://host.docker.internal:8001")
    internal_secret = env_str("INTERNAL_API_SECRET", "flowgen-internal-dev-secret")
    endpoint = f"{backend_url.rstrip('/')}/recordings/internal/upload"

    with video_path.open("rb") as handle:
        response = requests.post(
            endpoint,
            headers={"x-internal-api-secret": internal_secret},
            data={"taskId": task_id, "task": task},
            files={
                "file": (
                    video_path.name,
                    handle,
                    guess_type(video_path.name)[0] or "video/mp4",
                )
            },
            timeout=300,
        )

    if not response.ok:
        return RecordingArtifactsModel(
            provider=None,
            acl=get_uploadthing_acl(),
            fileKey=None,
            uploadUrl=None,
            localPath=str(video_path.resolve()),
            error=(
                f"UploadThing upload failed with {response.status_code}: {response.text}"
            ),
        )

    payload = response.json()
    return RecordingArtifactsModel(
        provider=payload.get("provider"),
        acl=payload.get("acl"),
        fileKey=payload.get("fileKey"),
        uploadUrl=payload.get("uploadUrl"),
        localPath=str(video_path.resolve()),
        error=payload.get("error"),
    )


def build_artifacts(
    raw_video_path: Path | None, task_id: str, task: str
) -> RecordingArtifactsModel:
    if raw_video_path is None:
        return RecordingArtifactsModel(
            provider=None,
            acl=get_uploadthing_acl() if get_storage_mode() == "uploadthing" else None,
            fileKey=None,
            uploadUrl=None,
            localPath=None,
            error="Recording video was not produced by the Python recorder.",
        )

    if get_storage_mode() == "uploadthing":
        return upload_video_to_uploadthing(raw_video_path, task_id, task)

    return RecordingArtifactsModel(
        provider=None,
        acl=None,
        fileKey=None,
        uploadUrl=None,
        localPath=str(raw_video_path.resolve()),
        error=None,
    )


def build_manifest(
    task_id: str,
    task: str,
    timeline: list[RecordingTimelineStepModel],
    started_at: datetime,
    ended_at: datetime,
) -> RecordingManifestModel:
    last_step_summary = timeline[-1].summary if timeline else None
    return RecordingManifestModel(
        taskId=task_id,
        task=task,
        provider="browser-use",
        sessionId=task_id,
        startedAt=isoformat_utc(started_at),
        endedAt=isoformat_utc(ended_at),
        stepCount=len(timeline),
        lastStepSummary=last_step_summary,
        steps=timeline,
    )


async def run_task(task: str, task_id: str | None = None) -> RecordingRunResponse:
    load_dotenv(dotenv_path=Path(".env"), override=False)
    normalized_task = task.strip()
    if not normalized_task:
        raise ValueError("task is required.")

    effective_task_id = task_id or (
        datetime.now(UTC).strftime("%Y%m%d-%H%M%S") + "-" + uuid4().hex[:8]
    )
    paths = make_run_paths(effective_task_id)
    collector = StepCollector(paths.step_traces_dir)
    profile = build_browser_profile(paths.raw_dir)
    llm = build_llm()
    fallback_llm = build_fallback_llm(llm)

    started_at = utc_now()
    previous_videos = set(paths.raw_dir.glob("*.mp4"))

    agent = Agent(
        task=normalized_task,
        llm=llm,
        fallback_llm=fallback_llm,
        browser_profile=profile,
        register_new_step_callback=collector.on_new_step,
        save_conversation_path=paths.conversations_dir,
        generate_gif=env_bool("BROWSER_USE_GENERATE_GIF", False),
    )

    history: AgentHistoryList[Any] = await agent.run()
    ended_at = utc_now()
    agent.save_history(paths.history_path)

    raw_video_path = pick_raw_video(paths.raw_dir, previous_videos)
    manifest = build_manifest(
        effective_task_id,
        normalized_task,
        build_timeline(history, collector.planned_steps, ended_at),
        started_at,
        ended_at,
    )
    paths.manifest_path.write_text(
        json.dumps(manifest.model_dump(mode="json", by_alias=True), indent=2),
        encoding="utf-8",
    )

    artifacts = build_artifacts(raw_video_path, effective_task_id, normalized_task)

    return RecordingRunResponse(
        providerTaskId=effective_task_id,
        manifest=manifest,
        artifacts=artifacts,
        taskDir=str(paths.task_dir.resolve()),
        historyPath=str(paths.history_path.resolve()),
        rawVideoPath=str(raw_video_path.resolve()) if raw_video_path else None,
    )


async def run_recording_job(task: str, task_id: str) -> None:
    paths = make_run_paths(task_id)
    started_at = utc_now()
    current_step_number = 0
    current_url: str | None = None
    current_title: str | None = None

    def on_step(step_number: int, trace_payload: dict[str, Any]) -> None:
        nonlocal current_step_number, current_url, current_title
        current_step_number = step_number
        current_url = trace_payload.get("url")
        current_title = trace_payload.get("title")
        persist_status(
            paths,
            task_id=task_id,
            task=task,
            status="running",
            started_at=started_at,
            current_step_number=current_step_number,
            step_count=current_step_number,
            current_url=current_url,
            current_title=current_title,
        )

    persist_status(
        paths,
        task_id=task_id,
        task=task,
        status="running",
        started_at=started_at,
    )

    load_dotenv(dotenv_path=Path(".env"), override=False)
    normalized_task = task.strip()
    if not normalized_task:
        raise ValueError("task is required.")

    collector = StepCollector(paths.step_traces_dir, on_step=on_step)
    profile = build_browser_profile(paths.raw_dir)
    llm = build_llm()
    fallback_llm = build_fallback_llm(llm)
    previous_videos = set(paths.raw_dir.glob("*.mp4"))

    try:
        agent = Agent(
            task=normalized_task,
            llm=llm,
            fallback_llm=fallback_llm,
            browser_profile=profile,
            register_new_step_callback=collector.on_new_step,
            save_conversation_path=paths.conversations_dir,
            generate_gif=env_bool("BROWSER_USE_GENERATE_GIF", False),
        )

        history: AgentHistoryList[Any] = await agent.run()
        ended_at = utc_now()
        agent.save_history(paths.history_path)

        raw_video_path = pick_raw_video(paths.raw_dir, previous_videos)
        manifest = build_manifest(
            task_id,
            normalized_task,
            build_timeline(history, collector.planned_steps, ended_at),
            started_at,
            ended_at,
        )
        write_json(paths.manifest_path, manifest.model_dump(mode="json", by_alias=True))

        artifacts = build_artifacts(raw_video_path, task_id, normalized_task)
        final_status: RecordingState = "completed" if artifacts.error is None else "failed"
        persist_status(
            paths,
            task_id=task_id,
            task=normalized_task,
            status=final_status,
            started_at=started_at,
            ended_at=ended_at,
            current_step_number=manifest.step_count,
            step_count=manifest.step_count,
            current_url=current_url,
            current_title=current_title,
            error=artifacts.error,
            manifest=manifest,
            artifacts=artifacts,
            history_path=paths.history_path if paths.history_path.exists() else None,
            raw_video_path=raw_video_path,
        )
    except Exception as exc:
        persist_status(
            paths,
            task_id=task_id,
            task=normalized_task,
            status="failed",
            started_at=started_at,
            ended_at=utc_now(),
            current_step_number=current_step_number,
            step_count=current_step_number,
            current_url=current_url,
            current_title=current_title,
            error=str(exc),
            history_path=paths.history_path if paths.history_path.exists() else None,
        )
        raise
    finally:
        RUNNING_RECORDINGS.pop(task_id, None)


app = FastAPI(title="Flowgen Python Recorder", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def cleanup_orphaned_recordings() -> None:
    task_root = get_task_root()
    if not task_root.exists():
        return
    now = utc_now()
    for candidate in task_root.iterdir():
        if not candidate.is_dir():
            continue
        status_path = candidate / "status.json"
        payload = read_json(status_path)
        if payload is None:
            continue
        if payload.get("status") in {"queued", "running"}:
            paths = make_run_paths(candidate.name, create_dirs=False)
            payload["status"] = "failed"
            payload["error"] = "Recording process was interrupted (server restart)."
            payload["endedAt"] = isoformat_utc(now)
            payload["isActive"] = False
            write_json(paths.status_path, payload)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/recordings", response_model=list[RecordingStatusModel])
async def get_recordings() -> list[RecordingStatusModel]:
    return list_recordings()


@app.get("/recordings/{task_id}", response_model=RecordingStatusModel)
async def get_recording(task_id: str) -> RecordingStatusModel:
    status = load_status(task_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Recording not found.")
    return status


@app.post("/recordings/run", response_model=RecordingStartResponse, status_code=202)
async def run_recording(request: RecordingRunRequest) -> RecordingStartResponse:
    task = request.task.strip()
    if not task:
        raise HTTPException(status_code=400, detail="task is required.")

    task_id = request.task_id or (
        datetime.now(UTC).strftime("%Y%m%d-%H%M%S") + "-" + uuid4().hex[:8]
    )

    existing = load_status(task_id)
    if existing is not None:
        if existing.status in {"queued", "running"} and existing.is_active:
            raise HTTPException(
                status_code=409,
                detail=f"Recording {task_id} is already running.",
            )
        old_paths = make_run_paths(task_id, create_dirs=False)
        if old_paths.task_dir.exists():
            import shutil
            shutil.rmtree(old_paths.task_dir, ignore_errors=True)
        if old_paths.conversations_dir.exists():
            import shutil
            shutil.rmtree(old_paths.conversations_dir, ignore_errors=True)
        if old_paths.step_traces_dir.exists():
            import shutil
            shutil.rmtree(old_paths.step_traces_dir, ignore_errors=True)

    paths = make_run_paths(task_id)
    started_at = utc_now()
    persist_status(
        paths,
        task_id=task_id,
        task=task,
        status="queued",
        started_at=started_at,
    )
    background_task = asyncio.create_task(
        run_recording_job(task=task, task_id=task_id),
        name=f"recording:{task_id}",
    )
    RUNNING_RECORDINGS[task_id] = background_task
    background_task.add_done_callback(consume_background_task_result)
    persist_status(
        paths,
        task_id=task_id,
        task=task,
        status="queued",
        started_at=started_at,
    )

    return RecordingStartResponse(
        taskId=task_id,
        sessionId=task_id,
        status="queued",
        startedAt=isoformat_utc(started_at),
        statusUrl=f"/recordings/{task_id}",
        task=task,
    )


def main() -> None:
    load_dotenv(dotenv_path=Path(".env"), override=False)
    task = os.getenv("BROWSER_USE_TASK", "").strip()
    if not task:
        raise ValueError("BROWSER_USE_TASK is required.")

    result = asyncio.run(run_task(task=task))
    print(result.raw_video_path or result.provider_task_id)


if __name__ == "__main__":
    main()

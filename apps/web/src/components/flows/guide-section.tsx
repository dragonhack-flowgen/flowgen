import * as React from "react"
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  FilmIcon,
  LoaderCircleIcon,
} from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import * as z from "zod"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { type Flow } from "@/hooks/use-flows"
import { useUpdateFlow } from "@/hooks/use-flows"
import {
  invalidateRecordingStatus,
  useRecordingStatus,
} from "@/hooks/use-recording"
import { RECORDER_API_URL } from "@/lib/api"
import { EditableSection } from "./editable-section"

const guideSchema = z.object({
  guide: z
    .string()
    .min(1, "Guide cannot be empty.")
    .max(5000, "Guide must be at most 5000 characters."),
})

type GuideFormData = z.infer<typeof guideSchema>

async function postToRecorder(flowId: string, task: string) {
  const res = await fetch(`${RECORDER_API_URL}/recordings/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, taskId: flowId }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error")
    throw new Error(`Recorder ${res.status}: ${body}`)
  }
  return res.json()
}

export function GuideSection({ flow }: Readonly<{ flow: Flow }>) {
  const [isEditing, setIsEditing] = React.useState(false)
  const queryClient = useQueryClient()
  const updateFlow = useUpdateFlow()
  const { data: recording } = useRecordingStatus(flow.id)
  const previousRecordingStatus = React.useRef<string | null>(null)

  const isRecordingActive =
    recording?.status === "queued" || recording?.status === "running"

  const form = useForm<GuideFormData>({
    resolver: zodResolver(guideSchema),
    defaultValues: {
      guide: flow.guide ?? "",
    },
  })

  React.useEffect(() => {
    form.reset({ guide: flow.guide ?? "" })
    setIsEditing(false)
  }, [flow.id, flow.guide, form])

  React.useEffect(() => {
    const nextStatus = recording?.status ?? null
    const prevStatus = previousRecordingStatus.current

    if (
      prevStatus &&
      prevStatus !== nextStatus &&
      (prevStatus === "queued" || prevStatus === "running")
    ) {
      if (nextStatus === "completed") {
        toast.success("Recording completed", {
          description: "The walkthrough video is ready.",
        })
      }

      if (nextStatus === "failed") {
        toast.error("Recording failed", {
          description:
            recording?.error || "The recorder stopped before finishing.",
        })
      }
    }

    previousRecordingStatus.current = nextStatus
  }, [recording])

  async function onSave(data: GuideFormData) {
    try {
      await updateFlow.mutateAsync({ id: flow.id, guide: data.guide })
      toast.success("Guide updated")
      setIsEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update guide")
    }
  }

  async function handleRecord() {
    if (!flow.guide) {
      toast.error("Generate a guide first before recording.")
      return
    }
    try {
      await postToRecorder(flow.id, flow.guide)
      invalidateRecordingStatus(queryClient, flow.id)
      toast.success("Recording started", {
        description: "The recorder is now executing the guide.",
      })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start recording"
      )
    }
  }

  return (
    <EditableSection
      title="Guide"
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onSave={form.handleSubmit(onSave)}
      onCancel={() => {
        form.reset()
        setIsEditing(false)
      }}
      runLabel="Record Video"
      onRun={handleRecord}
      isRunning={isRecordingActive}
      readView={
        <div className="flex flex-col gap-4">
          {flow.guide ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {flow.guide}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No guide generated yet.
            </p>
          )}

          {recording?.status === "running" && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  Recording in progress
                </span>
                <span className="text-xs text-muted-foreground">
                  {recording.currentUrl ? (
                    <>
                      Browsing{" "}
                      <span className="font-mono">
                        {recording.currentUrl.length > 60
                          ? recording.currentUrl.slice(0, 60) + "…"
                          : recording.currentUrl}
                      </span>
                    </>
                  ) : (
                    "Starting browser…"
                  )}
                </span>
              </div>
            </div>
          )}

          {recording?.status === "failed" && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
              <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-destructive">
                  Recording failed
                </span>
                <span className="text-xs text-destructive/80">
                  {recording.error || "An unknown error occurred."}
                </span>
              </div>
            </div>
          )}

          {recording?.status === "completed" && (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FilmIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Video Recording</span>
                </div>
                {recording.artifacts?.uploadUrl && (
                  <a
                    href={recording.artifacts.uploadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open <ExternalLinkIcon className="size-3" />
                  </a>
                )}
              </div>
              {recording.artifacts?.uploadUrl ? (
                <video
                  src={recording.artifacts.uploadUrl}
                  controls
                  className="w-full rounded-md border"
                  style={{ maxHeight: 360 }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Video is being processed…
                </span>
              )}
            </div>
          )}
        </div>
      }
    >
      <Controller
        name="guide"
        control={form.control}
        render={({ field, fieldState }) => (
          <InputGroup>
            <InputGroupTextarea
              {...field}
              placeholder={`1. Navigate to the page\n2. Click the button\n3. Fill in the form`}
              rows={10}
              className="min-h-40 resize-y font-mono text-sm"
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="block-end">
              <InputGroupText className="tabular-nums">
                {field.value.length}/5000 characters
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        )}
      />
    </EditableSection>
  )
}

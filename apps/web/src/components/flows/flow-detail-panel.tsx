import * as React from "react"
import { LoaderCircleIcon, RefreshCwIcon, VideoIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import * as z from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { type Flow, type FlowStatus } from "@/types/flow"
import { EditableSection } from "./editable-section"
import { PromptFormFields } from "./prompt-form-fields"

function getStatusLabel(status: FlowStatus): string {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

function getStatusVariant(
  status: FlowStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "complete") return "default"
  if (status === "failed") return "destructive"
  if (status === "draft") return "outline"
  return "secondary"
}

const promptSchema = z.object({
  name: z
    .string()
    .min(4, "Flow name must be at least 4 characters.")
    .max(24, "Flow name must be at most 24 characters."),
  description: z
    .string()
    .min(12, "Description must be at least 12 characters.")
    .max(500, "Description must be at most 500 characters."),
})

const stepsSchema = z.object({
  steps_md: z
    .string()
    .min(1, "Steps cannot be empty.")
    .max(5000, "Steps must be at most 5000 characters."),
})

type PromptFormData = z.infer<typeof promptSchema>
type StepsFormData = z.infer<typeof stepsSchema>

type FlowDetailPanelProps = Readonly<{
  flow: Flow
}>

type FlowVideoProps = Readonly<{
  videoUrl: string | null
  isProcessing: boolean
}>

function FlowVideo({ videoUrl, isProcessing }: FlowVideoProps) {
  if (videoUrl) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <video src={videoUrl} controls className="w-full" preload="metadata">
          <track kind="captions" />
        </video>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" />
        <span className="text-sm">Video is being generated…</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-muted-foreground">
      <VideoIcon className="size-4" />
      <span className="text-sm">No video generated yet for this flow.</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Prompt Section                                                     */
/* ------------------------------------------------------------------ */

function handleRunGenerateSteps() {
  toast.info("Generating steps…", {
    description: "Action steps are being generated from your prompt.",
  })
}

function PromptSection({ flow }: Readonly<{ flow: Flow }>) {
  const [isEditing, setIsEditing] = React.useState(false)

  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: { name: flow.name, description: flow.description },
  })

  React.useEffect(() => {
    form.reset({ name: flow.name, description: flow.description })
    setIsEditing(false)
  }, [flow.id, flow.name, flow.description, form])

  function onSave(data: PromptFormData) {
    toast.success("Prompt updated", {
      description: `"${data.name}" saved.`,
    })
    setIsEditing(false)
  }

  return (
    <EditableSection
      title="User Prompt"
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onSave={form.handleSubmit(onSave)}
      onCancel={() => {
        form.reset()
        setIsEditing(false)
      }}
      runLabel="Generate Steps"
      onRun={handleRunGenerateSteps}
      readView={
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{flow.name}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {flow.description}
          </p>
        </div>
      }
    >
      <PromptFormFields control={form.control} />
    </EditableSection>
  )
}

/* ------------------------------------------------------------------ */
/*  Steps Section                                                      */
/* ------------------------------------------------------------------ */

function handleRunRecordVideo() {
  toast.info("Recording video…", {
    description: "A video is being generated from the action steps.",
  })
}

function StepsSection({ flow }: Readonly<{ flow: Flow }>) {
  const [isEditing, setIsEditing] = React.useState(false)
  const isProcessing =
    flow.status === "generating" || flow.status === "recording"

  const form = useForm<StepsFormData>({
    resolver: zodResolver(stepsSchema),
    defaultValues: {
      steps_md: flow.steps_md ?? "",
    },
  })

  React.useEffect(() => {
    form.reset({ steps_md: flow.steps_md ?? "" })
    setIsEditing(false)
  }, [flow.id, flow.steps_md, form])

  function onSave(data: StepsFormData) {
    const lineCount = data.steps_md
      .split("\n")
      .filter((l) => l.trim().length > 0).length
    toast.success("Steps updated", {
      description: `Saved ${lineCount} step(s).`,
    })
    setIsEditing(false)
  }

  return (
    <EditableSection
      title="Action Steps"
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onSave={form.handleSubmit(onSave)}
      onCancel={() => {
        form.reset()
        setIsEditing(false)
      }}
      runLabel="Record Video"
      onRun={handleRunRecordVideo}
      headerExtra={
        isProcessing ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LoaderCircleIcon className="size-3.5 animate-spin" />
            Processing…
          </div>
        ) : undefined
      }
      readView={
        flow.steps_md ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {flow.steps_md}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No steps generated yet.
          </p>
        )
      }
    >
      <Controller
        name="steps_md"
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

/* ------------------------------------------------------------------ */
/*  Video Section                                                      */
/* ------------------------------------------------------------------ */

function handleRunRegenerateVideo() {
  toast.info("Regenerating video…", {
    description: "The video is being regenerated from the current steps.",
  })
}

function VideoSection({ flow }: Readonly<{ flow: Flow }>) {
  const isProcessing =
    flow.status === "generating" || flow.status === "recording"

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Generated Video
        </h3>
        {flow.video_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunRegenerateVideo}
            disabled={isProcessing}
          >
            <RefreshCwIcon className="mr-1.5 size-3.5" />
            Regenerate
          </Button>
        )}
      </div>
      <FlowVideo videoUrl={flow.video_url} isProcessing={isProcessing} />
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export function FlowDetailPanel({ flow }: FlowDetailPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl leading-none font-semibold">{flow.name}</h2>
          <Badge variant={getStatusVariant(flow.status)}>
            {getStatusLabel(flow.status)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-6">
        <PromptSection flow={flow} />
        <Separator />
        <StepsSection flow={flow} />
        <Separator />
        <VideoSection flow={flow} />
      </div>
    </div>
  )
}

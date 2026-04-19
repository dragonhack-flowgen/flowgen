import * as React from "react"
import { LoaderCircleIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import * as z from "zod"

import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { type Flow, type FlowStatus } from "@/types/flow"
import { useUpdateFlow } from "@/hooks/use-flows"
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
  if (status === "completed") return "default"
  if (status === "failed") return "destructive"
  if (status === "pending") return "outline"
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

const guideSchema = z.object({
  guide: z
    .string()
    .min(1, "Guide cannot be empty.")
    .max(5000, "Guide must be at most 5000 characters."),
})

type PromptFormData = z.infer<typeof promptSchema>
type GuideFormData = z.infer<typeof guideSchema>

type FlowDetailPanelProps = Readonly<{
  flow: Flow
}>

const RECORDER_API_URL =
  import.meta.env.VITE_RECORDER_API_URL ?? "http://localhost:8000"

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

/* ------------------------------------------------------------------ */
/*  Prompt Section                                                     */
/* ------------------------------------------------------------------ */

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
/*  Guide Section                                                      */
/* ------------------------------------------------------------------ */

function GuideSection({ flow }: Readonly<{ flow: Flow }>) {
  const [isEditing, setIsEditing] = React.useState(false)
  const updateFlow = useUpdateFlow()
  const isProcessing = flow.status === "running" || flow.status === "pending"

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

  async function onSave(data: GuideFormData) {
    try {
      await updateFlow.mutateAsync({ id: flow.id, guide: data.guide })
      toast.success("Guide updated")
      setIsEditing(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update guide"
      )
    }
  }

  async function handleRecord() {
    if (!flow.guide) {
      toast.error("Generate a guide first before recording.")
      return
    }
    try {
      await postToRecorder(flow.id, flow.guide)
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
      isRunning={isProcessing}
      headerExtra={
        isProcessing ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LoaderCircleIcon className="size-3.5 animate-spin" />
            Processing…
          </div>
        ) : undefined
      }
      readView={
        flow.guide ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {flow.guide}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No guide generated yet.
          </p>
        )
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

/* ------------------------------------------------------------------ */
/*  User Docs Section                                                  */
/* ------------------------------------------------------------------ */

function UserDocsSection({ flow }: Readonly<{ flow: Flow }>) {
  const [isEditing, setIsEditing] = React.useState(false)
  const updateFlow = useUpdateFlow()

  const form = useForm<{ userDocs: string }>({
    resolver: zodResolver(
      z.object({
        userDocs: z
          .string()
          .min(1, "Documentation cannot be empty.")
          .max(10000, "Documentation must be at most 10000 characters."),
      })
    ),
    defaultValues: { userDocs: flow.userDocs ?? "" },
  })

  React.useEffect(() => {
    form.reset({ userDocs: flow.userDocs ?? "" })
    setIsEditing(false)
  }, [flow.id, flow.userDocs, form])

  async function onSave(data: { userDocs: string }) {
    try {
      await updateFlow.mutateAsync({ id: flow.id, userDocs: data.userDocs })
      toast.success("Documentation updated")
      setIsEditing(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update documentation"
      )
    }
  }

  return (
    <EditableSection
      title="User Documentation"
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onSave={form.handleSubmit(onSave)}
      onCancel={() => {
        form.reset()
        setIsEditing(false)
      }}
      readView={
        flow.userDocs ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {flow.userDocs}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No documentation generated yet.
          </p>
        )
      }
    >
      <Controller
        name="userDocs"
        control={form.control}
        render={({ field, fieldState }) => (
          <InputGroup>
            <InputGroupTextarea
              {...field}
              placeholder="Step-by-step user documentation..."
              rows={8}
              className="min-h-32 resize-y text-sm"
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="block-end">
              <InputGroupText className="tabular-nums">
                {field.value.length}/10000 characters
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        )}
      />
    </EditableSection>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export function FlowDetailPanel({ flow }: FlowDetailPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl leading-none font-semibold">{flow.name}</h2>
          <Badge variant={getStatusVariant(flow.status)}>
            {getStatusLabel(flow.status)}
          </Badge>
        </div>
      </div>

      {flow.error && (
        <div className="border-b border-destructive/50 bg-destructive/5 px-4 py-3">
          <h3 className="text-sm font-medium text-destructive">Error</h3>
          <p className="mt-1 text-sm text-destructive/80">{flow.error}</p>
        </div>
      )}

      <div className="flex flex-col gap-8 p-6">
        <PromptSection flow={flow} />
        <Separator />
        <GuideSection flow={flow} />
        <Separator />
        <UserDocsSection flow={flow} />
      </div>

      {(flow.status === "pending" || flow.status === "running") && (
        <div className="flex items-center gap-2 border-t px-6 py-3 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          <span>
            {flow.status === "pending"
              ? "Exploration in progress..."
              : "AI is exploring the codebase..."}
          </span>
        </div>
      )}
    </div>
  )
}

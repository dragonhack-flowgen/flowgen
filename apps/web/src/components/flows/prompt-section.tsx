import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import * as z from "zod"

import { type Flow } from "@/hooks/use-flows"
import { useUpdateFlow } from "@/hooks/use-flows"
import { EditableSection } from "./editable-section"
import { PromptFormFields } from "./prompt-form-fields"

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

type PromptFormData = z.infer<typeof promptSchema>

export function PromptSection({ flow }: Readonly<{ flow: Flow }>) {
  const [isEditing, setIsEditing] = React.useState(false)
  const updateFlow = useUpdateFlow()

  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: { name: flow.name, description: flow.description },
  })

  React.useEffect(() => {
    form.reset({ name: flow.name, description: flow.description })
    setIsEditing(false)
  }, [flow.id, flow.name, flow.description, form])

  async function onSave(data: PromptFormData) {
    try {
      await updateFlow.mutateAsync({
        id: flow.id,
        ...data,
      })
      toast.success("Prompt updated", {
        description: `"${data.name}" saved.`,
      })
      setIsEditing(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update prompt"
      )
    }
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

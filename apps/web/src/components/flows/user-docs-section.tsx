import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import * as z from "zod"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { type Flow } from "@/hooks/use-flows"
import { useUpdateFlow } from "@/hooks/use-flows"
import { EditableSection } from "./editable-section"

const userDocsSchema = z.object({
  userDocs: z
    .string()
    .min(1, "Documentation cannot be empty.")
    .max(10000, "Documentation must be at most 10000 characters."),
})

export function UserDocsSection({ flow }: Readonly<{ flow: Flow }>) {
  const [isEditing, setIsEditing] = React.useState(false)
  const updateFlow = useUpdateFlow()

  const form = useForm<{ userDocs: string }>({
    resolver: zodResolver(userDocsSchema),
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

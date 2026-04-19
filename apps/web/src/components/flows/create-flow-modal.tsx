import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { useNavigate } from "@tanstack/react-router"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { PlusIcon } from "lucide-react"
import { SidebarMenuButton } from "../ui/sidebar"
import { useCreateFlow } from "@/hooks/use-flows"
import { promptSchema, type PromptFormData } from "@/types/flow"
import { PromptFormFields } from "./prompt-form-fields"

export function CreateFlowModal() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const createFlow = useCreateFlow()

  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  async function onSubmit(data: PromptFormData) {
    try {
      const result = await createFlow.mutateAsync(data)
      toast.success("Flow Created")
      setOpen(false)
      navigate({ to: "/flows", search: { flowId: result.id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create flow")
    }
  }

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [open, form])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <SidebarMenuButton
            variant="variant"
            tooltip="Create New Flow"
            aria-label="Create New Flow"
            className="group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center"
          >
            <PlusIcon />
            <span className="group-data-[collapsible=icon]:hidden">
              Create New Flow
            </span>
          </SidebarMenuButton>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Flow</DialogTitle>
          <DialogDescription>
            Create a new step-by-step user flow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
          <PromptFormFields
            control={form.control}
            namePlaceholder="Admin User Creation Flow"
            descriptionPlaceholder="How to add new user to our organization as an admin?"
          />
          <Field orientation="horizontal" className="mt-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Flow</Button>
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  )
}

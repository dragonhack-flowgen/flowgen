import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
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
import { PromptFormFields } from "./prompt-form-fields"

const formSchema = z.object({
  name: z
    .string()
    .min(4, "Flow name must be at least 4 characters.")
    .max(24, "Flow name must be at most 24 characters."),
  description: z
    .string()
    .min(12, "Description must be at least 12 characters.")
    .max(500, "Description must be at most 500 characters."),
})

export function CreateFlowModal() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const createFlow = useCreateFlow()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
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
          <SidebarMenuButton variant="variant">
            <PlusIcon />
            Create New Flow
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

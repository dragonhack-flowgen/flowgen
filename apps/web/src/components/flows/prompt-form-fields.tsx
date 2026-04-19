import { Controller, type Control } from "react-hook-form"

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CircleHelpIcon } from "lucide-react"

type PromptFormValues = {
  name: string
  description: string
}

type PromptFormFieldsProps = Readonly<{
  control: Control<PromptFormValues>
  namePlaceholder?: string
  descriptionPlaceholder?: string
}>

export type { PromptFormValues }

export function PromptFormFields({
  control,
  namePlaceholder = "Flow name",
  descriptionPlaceholder = "Describe the user flow...",
}: PromptFormFieldsProps) {
  return (
    <FieldGroup>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Flow Name</FieldLabel>
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              placeholder={namePlaceholder}
              autoComplete="off"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center gap-2">
              <FieldLabel>Description</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      aria-label="Description prompt writing help"
                    >
                      <CircleHelpIcon data-icon="inline-start" />
                      Help
                    </Button>
                  }
                />
                <PopoverContent
                  side="top"
                  align="start"
                  className="w-80 max-w-sm gap-3 border border-primary bg-gradient-to-b from-primary/95 via-popover to-popover shadow-lg ring-1 ring-primary/20"
                >
                  <p className="w-fit rounded-full bg-primary/99 px-2 py-0.5 text-xs font-medium tracking-wide text-white">
                    Description Coach
                  </p>
                  <PopoverHeader>
                    <PopoverTitle className="text-white">
                      How to give a good process description
                    </PopoverTitle>
                    <PopoverDescription>
                      For best results, describe the desired path as observable
                      actions.
                    </PopoverDescription>
                  </PopoverHeader>
                  <ul className="flex flex-col gap-2 text-left leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/90 text-xs font-medium text-white">
                        1
                      </span>
                      <span>
                        Set scope and boundaries - what does the process
                        include/not include?
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/90 text-xs font-medium text-white">
                        2
                      </span>
                      <span>
                        Mention decision points and failure handling (e.g. "If
                        the description is too short, show validation and do not
                        submit").
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/90 text-xs font-medium text-white">
                        3
                      </span>
                      <span>
                        End with a clear desired outcome (e.g. "The user
                        successfully creates a new flow and sees it in their
                        dashboard").
                      </span>
                    </li>
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
            <InputGroup>
              <InputGroupTextarea
                {...field}
                placeholder={descriptionPlaceholder}
                rows={4}
                className="min-h-24 resize-none"
                aria-invalid={fieldState.invalid}
              />
              <InputGroupAddon align="block-end">
                <InputGroupText className="tabular-nums">
                  {field.value.length}/500 characters
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}

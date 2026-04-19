import { Controller, type Control } from "react-hook-form"

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"

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
            <FieldLabel>Description</FieldLabel>
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

import * as React from "react"
import { LoaderCircleIcon, PencilIcon, PlayIcon, SaveIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type EditableSectionProps = Readonly<{
  title: string
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  runLabel?: string
  onRun?: () => void
  isRunning?: boolean
  headerExtra?: React.ReactNode
  children: React.ReactNode
  readView: React.ReactNode
}>

export function EditableSection({
  title,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  runLabel,
  onRun,
  isRunning,
  headerExtra,
  children,
  readView,
}: EditableSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {headerExtra}
        </div>
        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <XIcon className="mr-1.5 size-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={onSave}>
                <SaveIcon className="mr-1.5 size-3.5" />
                Save
              </Button>
            </>
          ) : (
            <>
              {onRun && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onRun}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <LoaderCircleIcon className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <PlayIcon className="mr-1.5 size-3.5" />
                  )}
                  {runLabel ?? "Run"}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <PencilIcon className="mr-1.5 size-3.5" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>
      {isEditing ? children : readView}
    </section>
  )
}

import { createFileRoute } from "@tanstack/react-router"
import {
  CheckCircle2Icon,
  CircleQuestionMarkIcon,
  ClipboardListIcon,
  CogIcon,
  FilmIcon,
  PlayCircleIcon,
  SparklesIcon,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export const Route = createFileRoute("/help")({
  component: HelpPage,
})

const quickStart = [
  {
    icon: SparklesIcon,
    title: "Create a flow",
    description:
      'Use "Create New Flow" and provide a clear name + process description (goal, scope, expected result).',
    badge: "Step 1",
  },
  {
    icon: ClipboardListIcon,
    title: "Review and edit the guide",
    description:
      "Open the flow, refine the generated guide text, then save when the steps reflect the exact UI behavior you want to document.",
    badge: "Step 2",
  },
  {
    icon: FilmIcon,
    title: "Record a walkthrough video",
    description:
      'Click "Record Video" in the Guide section after your steps are ready. FlowGen runs the guide and attaches the video when complete.',
    badge: "Step 3",
  },
  {
    icon: PlayCircleIcon,
    title: "Publish user documentation",
    description:
      "Download the markdown instructions and video walkthrough to share with your team or embed in a knowledge base.",
    badge: "Step 4",
  },
]

const pages = [
  {
    icon: ClipboardListIcon,
    title: "Flows",
    description:
      "Your working area. Create flows, edit prompts, update guides, record videos, and maintain user docs.",
  },
  {
    icon: CogIcon,
    title: "Settings",
    description:
      "Connect a GitHub/GitLab repository to keep docs grounded in your codebase.",
  },
  {
    icon: CircleQuestionMarkIcon,
    title: "Help",
    description:
      "Reference workflows, writing tips, and troubleshooting when generated output needs refinement.",
  },
]

const descriptionChecklist = [
  "State what the process includes and excludes.",
  "Describe observable actions, not abstract intent.",
  "Include decision points and failure handling.",
  "Finish with a concrete desired end state.",
]

function HelpPage() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3.5 p-4">
        <PageHeader title="Help" />
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          FlowGen turns process descriptions into editable guides, videos, and
          user docs. Use this page as a practical playbook for daily usage.
        </p>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quick Start</h2>
            <Badge variant="outline">Recommended order</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {quickStart.map((guide) => (
              <Card key={guide.title} size="sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <guide.icon className="size-4" />
                    </div>
                    <Badge variant="outline">{guide.badge}</Badge>
                  </div>
                  <CardTitle>{guide.title}</CardTitle>
                  <CardDescription>{guide.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">What Each Page Does</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <Card key={page.title} size="sm">
                <CardHeader>
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <page.icon className="size-4" />
                  </div>
                  <CardTitle>{page.title}</CardTitle>
                  <CardDescription>{page.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        <section className="flex max-w-2xl flex-col gap-3">
          <h2 className="text-lg font-semibold">
            Writing Better Process Descriptions
          </h2>
          <p className="text-sm text-muted-foreground">
            Better input gives better guides. Use this checklist before saving a
            new flow prompt.
          </p>
          <ol className="flex flex-col gap-2">
            {descriptionChecklist.map((item, i) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        <section className="flex max-w-2xl flex-col gap-3">
          <h2 className="text-lg font-semibold">Common Issues</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                If the guide is too generic, tighten the process description
                with concrete page names and validation outcomes.
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                If recording fails, update the instruction text to remove
                ambiguous steps and retry Record Video.
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

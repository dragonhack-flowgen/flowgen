import { createFileRoute } from "@tanstack/react-router"
import {
  BookOpenIcon,
  FileTextIcon,
  PlayCircleIcon,
  RocketIcon,
  SettingsIcon,
  ZapIcon,
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

const guides = [
  {
    icon: RocketIcon,
    title: "Getting Started",
    description:
      "Learn how to create your first flow, connect your codebase, and generate step-by-step documentation.",
    badge: "Beginner",
  },
  {
    icon: FileTextIcon,
    title: "Creating Flows",
    description:
      "Describe what you want documented in plain language. FlowGen turns your prompt into numbered action steps automatically.",
    badge: "Core",
  },
  {
    icon: ZapIcon,
    title: "Generating Action Steps",
    description:
      'Once a flow prompt is saved, click "Generate Steps" to produce a detailed markdown list of user actions.',
    badge: "Core",
  },
  {
    icon: PlayCircleIcon,
    title: "Recording Videos",
    description:
      'After steps are reviewed, click "Record Video" to create an automated walkthrough video of the entire flow.',
    badge: "Core",
  },
  {
    icon: SettingsIcon,
    title: "Connecting Your Codebase",
    description:
      "Link a GitHub or GitLab repository in Settings so FlowGen can analyse your application and generate more accurate flows.",
    badge: "Setup",
  },
  {
    icon: BookOpenIcon,
    title: "Editing & Re-running",
    description:
      "Every section — prompt, steps, and video — can be edited and re-run independently at any time.",
    badge: "Advanced",
  },
]

function HelpPage() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-4">
        <PageHeader title="Help" />
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Everything you need to know about FlowGen — from creating your first
          flow to generating walkthrough videos of your application.
        </p>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
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

        <Separator />

        <section className="flex max-w-2xl flex-col gap-4">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="flex flex-col gap-3">
            {[
              'Describe your user flow in the prompt field (e.g. "How does a new admin create an account?").',
              "FlowGen analyses your codebase and generates a numbered list of action steps in markdown.",
              'Review and edit the steps, then click "Record Video" to produce an automated walkthrough.',
              "Share the generated documentation — steps and video — with your team.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

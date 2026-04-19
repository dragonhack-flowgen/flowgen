import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { GitBranchIcon, GitForkIcon, UnlinkIcon } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

type Provider = "github" | "gitlab"

interface Connection {
  provider: Provider
  repo: string
  connectedAt: string
}

function SettingsPage() {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [repoUrl, setRepoUrl] = useState("")
  const [connecting, setConnecting] = useState<Provider | null>(null)

  function handleConnect(provider: Provider) {
    if (!repoUrl.trim()) {
      toast.error("Please enter a repository URL")
      return
    }
    setConnecting(provider)
    // Simulate async connection
    setTimeout(() => {
      setConnection({
        provider,
        repo: repoUrl.trim(),
        connectedAt: new Date().toLocaleDateString(),
      })
      setConnecting(null)
      toast.success(
        `Connected to ${provider === "github" ? "GitHub" : "GitLab"} repository`
      )
    }, 1500)
  }

  function handleDisconnect() {
    setConnection(null)
    setRepoUrl("")
    toast.info("Repository disconnected")
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-4">
        <PageHeader title="Settings" />

        <Separator />

        {/* Codebase Connection */}
        <section className="flex max-w-2xl flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Codebase Access</h2>
            <p className="text-sm text-muted-foreground">
              Connect your GitHub or GitLab repository so FlowGen can analyse
              your application and generate accurate user flows.
            </p>
          </div>

          {connection ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {connection.provider === "github" ? (
                    <GitForkIcon className="size-5" />
                  ) : (
                    <GitBranchIcon className="size-5" />
                  )}
                  <CardTitle className="text-base">
                    {connection.provider === "github" ? "GitHub" : "GitLab"}
                  </CardTitle>
                  <Badge variant="default">Connected</Badge>
                </div>
                <CardDescription className="break-all">
                  {connection.repo}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Connected on {connection.connectedAt}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <UnlinkIcon className="mr-2 size-4" />
                  Disconnect
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Connect a repository
                </CardTitle>
                <CardDescription>
                  Paste the URL of a GitHub or GitLab repository to get started.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field>
                  <FieldLabel>Repository URL</FieldLabel>
                  <Input
                    placeholder="https://github.com/your-org/your-repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                </Field>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  onClick={() => handleConnect("github")}
                  disabled={connecting !== null}
                >
                  <GitForkIcon className="mr-2 size-4" />
                  {connecting === "github" ? "Connecting…" : "Connect GitHub"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleConnect("gitlab")}
                  disabled={connecting !== null}
                >
                  <GitBranchIcon className="mr-2 size-4" />
                  {connecting === "gitlab" ? "Connecting…" : "Connect GitLab"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </section>

        <Separator />

        {/* General Settings placeholder */}
        <section className="flex max-w-2xl flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">General</h2>
            <p className="text-sm text-muted-foreground">
              Additional settings will appear here in the future.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

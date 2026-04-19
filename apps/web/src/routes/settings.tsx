import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { GitBranchIcon, GitForkIcon, UnlinkIcon } from "lucide-react"
import { toast } from "sonner"

import { useDeleteSettings, useSettings, useUpdateSettings } from "@/hooks/use-settings"
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
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

type Provider = "github" | "gitlab"

interface ConnectionDetails {
  provider: Provider
  repo: string
}

function parseRepositoryUrl(repoUrl: string): ConnectionDetails | null {
  const normalized = repoUrl.trim().replace(/\.git$/, "")

  try {
    const url = new URL(normalized)
    if (url.protocol !== "https:") return null

    let provider: Provider | null = null
    if (url.hostname === "github.com") provider = "github"
    if (url.hostname === "gitlab.com") provider = "gitlab"
    if (!provider) return null

    const [owner, repo] = url.pathname.split("/").filter(Boolean)
    if (!owner || !repo) return null

    return {
      provider,
      repo: `${owner}/${repo}`,
    }
  } catch {
    return null
  }
}

function providerLabel(provider: Provider) {
  return provider === "github" ? "GitHub" : "GitLab"
}

function SettingsPage() {
  const settingsQuery = useSettings()
  const updateSettings = useUpdateSettings()
  const deleteSettings = useDeleteSettings()
  const [repoUrl, setRepoUrl] = useState("")

  const gitUrl = settingsQuery.data?.gitUrl ?? null
  const connection = gitUrl ? parseRepositoryUrl(gitUrl) : null

  // Sync input field when server data loads for the first time
  useEffect(() => {
    if (gitUrl && !repoUrl) {
      setRepoUrl(gitUrl)
    }
  }, [gitUrl])

  async function handleConnect() {
    const parsed = parseRepositoryUrl(repoUrl)
    if (!repoUrl.trim()) {
      toast.error("Please enter a repository URL")
      return
    }
    if (!parsed) {
      toast.error("Enter a valid public GitHub or GitLab HTTPS repository URL")
      return
    }

    try {
      const result = await updateSettings.mutateAsync({
        gitUrl: repoUrl.trim().replace(/\.git$/, ""),
      })
      setRepoUrl(result.gitUrl)
      toast.success(`Connected to ${providerLabel(parsed.provider)} repository`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to connect repository"
      )
    }
  }

  async function handleDisconnect() {
    try {
      await deleteSettings.mutateAsync()
      setRepoUrl("")
      toast.info("Repository disconnected")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect repository"
      )
    }
  }

  const isSaving = updateSettings.isPending
  const isDisconnecting = deleteSettings.isPending
  const formProvider = parseRepositoryUrl(repoUrl)?.provider

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 p-4">
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

          {settingsQuery.isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Spinner />
              </CardContent>
            </Card>
          ) : settingsQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load repository settings</AlertTitle>
              <AlertDescription>
                {settingsQuery.error instanceof Error
                  ? settingsQuery.error.message
                  : "Please try again."}
              </AlertDescription>
            </Alert>
          ) : connection && settingsQuery.data?.gitUrl ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {connection.provider === "github" ? (
                    <GitForkIcon className="size-5" />
                  ) : (
                    <GitBranchIcon className="size-5" />
                  )}
                  <CardTitle className="text-base">
                    {providerLabel(connection.provider)}
                  </CardTitle>
                  <Badge variant="default">Connected</Badge>
                </div>
                <CardDescription className="break-all">
                  {settingsQuery.data.gitUrl}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Flow creation will explore this repository's codebase.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  <UnlinkIcon className="mr-2 size-4" />
                  {isDisconnecting ? "Disconnecting…" : "Disconnect"}
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
                <p className="text-xs text-muted-foreground">
                  Supports public repositories on GitHub and GitLab.
                </p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  onClick={handleConnect}
                  disabled={isSaving}
                >
                  <GitForkIcon className="mr-2 size-4" />
                  {isSaving && formProvider === "github"
                    ? "Connecting…"
                    : "Connect GitHub"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleConnect}
                  disabled={isSaving}
                >
                  <GitBranchIcon className="mr-2 size-4" />
                  {isSaving && formProvider === "gitlab"
                    ? "Connecting…"
                    : "Connect GitLab"}
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

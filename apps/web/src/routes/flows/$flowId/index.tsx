import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/flows/$flowId/")({
  component: FlowDetailRedirect,
})

function FlowDetailRedirect() {
  return <Navigate to="/flows" />
}

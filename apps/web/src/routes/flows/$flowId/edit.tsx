import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/flows/$flowId/edit")({
  component: EditFlowRedirect,
})

function EditFlowRedirect() {
  return <Navigate to="/flows" />
}

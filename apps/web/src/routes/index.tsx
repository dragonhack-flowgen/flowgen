import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: RootRouteRedirect,
})

function RootRouteRedirect() {
  return <Navigate to="/flows" />
}

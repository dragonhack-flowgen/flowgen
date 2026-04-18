import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/flows")({
  staticData: { breadcrumb: "Flows" },
  component: () => <Outlet />,
})

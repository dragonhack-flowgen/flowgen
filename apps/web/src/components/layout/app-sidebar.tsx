import * as React from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  ListIcon,
  MoonIcon,
  SunIcon,
  CircleQuestionMarkIcon,
  CogIcon,
} from "lucide-react"

import { useTheme } from "@/providers/theme-provider"
import { CreateFlowModal } from "@/components/flows/create-flow-modal"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const navItems = [
  { label: "Flows", icon: ListIcon, to: "/flows" as const },
  { label: "Help", icon: CircleQuestionMarkIcon, to: "/help" as const },
  { label: "Settings", icon: CogIcon, to: "/settings" as const },
]

function isNavItemActive(
  pathname: string,
  to: (typeof navItems)[number]["to"]
) {
  if (to === "/flows") {
    return pathname === "/flows" || pathname.startsWith("/flows/")
  }

  if (to === "/help") {
    return pathname === "/help" || pathname.startsWith("/help/")
  }

  if (to === "/settings") {
    return pathname === "/settings" || pathname.startsWith("/settings/")
  }

  return false
}

function SidebarHeaderContent() {
  return (
    <SidebarHeader className="gap-0 p-0">
      <div className="flex items-center justify-between border-b px-4 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          to="/flows"
          className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden"
        >
          <img
            src="/logo.svg"
            alt="FlowGen logo"
            className="h-8 shrink-0 rounded-lg"
          />
        </Link>
        <SidebarTrigger className="shrink-0" />
      </div>
      <div className="flex items-center border-b p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <CreateFlowModal />
      </div>
    </SidebarHeader>
  )
}

export function AppSidebar({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { theme, setTheme } = useTheme()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeaderContent />

        <SidebarContent>
          <SidebarGroup className="px-4 py-2 group-data-[collapsible=icon]:px-2">
            <SidebarGroupLabel className="px-0">Platform</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={isNavItemActive(pathname, item.to)}
                    render={<Link to={item.to} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-4 py-2 group-data-[collapsible=icon]:px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}

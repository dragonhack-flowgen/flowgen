import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"
import {
  ListIcon,
  MoonIcon,
  SunIcon,
  CircleQuestionMarkIcon,
  CogIcon,
} from "lucide-react"

import { useTheme } from "@/components/theme-provider"
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
  useSidebar,
} from "@/components/ui/sidebar"

const navItems = [
  { label: "Flows", icon: ListIcon, to: "/flows" as const },
  { label: "Help", icon: CircleQuestionMarkIcon, to: "/help" as const },
  { label: "Settings", icon: CogIcon, to: "/settings" as const },
]

function SidebarHeaderContent() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarHeader>
      {isCollapsed ? (
        <>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarTrigger className="mx-auto" />
            </SidebarMenuItem>
          </SidebarMenu>
          <CreateFlowModal />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Link to="/flows" className="flex items-center gap-2 px-2 py-1">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-sm font-bold">FG</span>
              </div>
              <span className="truncate text-sm font-semibold">FlowGen</span>
            </Link>
            <SidebarTrigger />
          </div>
          <CreateFlowModal />
        </>
      )}
    </SidebarHeader>
  )
}

export function AppSidebar({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeaderContent />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={
                      router.state.location.pathname === item.to ||
                      router.state.location.pathname.startsWith(item.to)
                    }
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

        <SidebarFooter>
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

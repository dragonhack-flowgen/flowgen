import { Outlet, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { ThemeProvider } from "@/providers/theme-provider"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/sonner"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="flowgen-theme">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-md"
      >
        Skip to main content
      </a>
      <AppSidebar>
        <div id="main" className="flex-1 overflow-auto" tabIndex={-1}>
          <Outlet />
        </div>
      </AppSidebar>
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
    </ThemeProvider>
  )
}

import * as React from "react"
import { useMatches } from "@tanstack/react-router"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    breadcrumb?: string
  }
}

export function AppHeader() {
  const matches = useMatches()

  const breadcrumbs = matches
    .filter((match) => match.staticData?.breadcrumb)
    .map((match) => ({
      label: match.staticData.breadcrumb as string,
      path: match.pathname,
    }))

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      {breadcrumbs.length > 0 && (
        <>
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.path}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {i < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink render={<a href={crumb.path} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </>
      )}
    </header>
  )
}

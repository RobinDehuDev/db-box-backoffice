"use client"

import { ClerkProvider, useAuth } from "@clerk/nextjs"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ConvexReactClient } from "convex/react"
import { useMemo, type ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  const convex = useMemo(() => {
    if (!convexUrl) return null
    return new ConvexReactClient(convexUrl)
  }, [convexUrl])

  if (!publishableKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F4F5] p-6">
        <p className="max-w-md text-center text-neutral-600">
          Définissez{" "}
          <code className="font-mono text-sm">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
          et <code className="font-mono text-sm">NEXT_PUBLIC_CONVEX_URL</code>{" "}
          dans <code className="font-mono text-sm">.env.local</code>.
        </p>
      </div>
    )
  }

  if (!convex) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F4F5] p-6">
        <p className="max-w-md text-center text-neutral-600">
          Définissez <code className="font-mono text-sm">NEXT_PUBLIC_CONVEX_URL</code>{" "}
          après avoir lancé <code className="font-mono text-sm">npx convex dev</code>.
        </p>
      </div>
    )
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

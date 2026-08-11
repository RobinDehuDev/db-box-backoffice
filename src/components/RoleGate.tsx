"use client"

import { useAuth, SignOutButton } from "@clerk/nextjs"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { api } from "@convex/_generated/api"

export function RoleGate({ children }: { children: ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth()
  const ensureUser = useMutation(api.users.ensure)
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip")
  const router = useRouter()

  useEffect(() => {
    if (!clerkLoaded) return
    if (!isSignedIn) {
      router.replace("/sign-in")
    }
  }, [clerkLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isAuthenticated) return
    void ensureUser({}).catch(() => {
      // Surface via me / denied flow; avoid crashing the shell.
    })
  }, [isAuthenticated, ensureUser])

  useEffect(() => {
    if (isAuthenticated && me?.signedIn && me.role == null) {
      router.replace("/denied")
    }
  }, [isAuthenticated, me, router])

  if (!clerkLoaded || convexAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F4F5] text-neutral-500">
        Chargement…
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F4F5] px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Configuration d’authentification incomplète
        </h1>
        <p className="max-w-md text-neutral-600">
          Connecté via Clerk, mais Convex n’a pas pu valider votre session.
          Vérifiez qu’un modèle JWT Clerk nommé{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm">
            convex
          </code>{" "}
          existe (avec <code className="font-mono text-sm">aud: &quot;convex&quot;</code>
          ) et que la variable Convex{" "}
          <code className="font-mono text-sm">CLERK_JWT_ISSUER_DOMAIN</code>{" "}
          correspond à l’URL Frontend API de Clerk.
        </p>
        <SignOutButton>
          <button
            type="button"
            className="min-h-12 rounded-full bg-neutral-800 px-6 font-semibold text-white"
          >
            Se déconnecter
          </button>
        </SignOutButton>
      </div>
    )
  }

  if (me === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F4F5] text-neutral-500">
        Chargement…
      </div>
    )
  }

  if (me.signedIn && me.role == null) {
    return null
  }

  return <>{children}</>
}

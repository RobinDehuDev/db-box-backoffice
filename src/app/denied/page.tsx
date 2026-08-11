import { SignOutButton } from "@clerk/nextjs"
import Link from "next/link"

export default function DeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F4F5] px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Vous n’avez pas encore accès à cette application
      </h1>
      <p className="max-w-md text-center text-neutral-600">
        Vous êtes connecté, mais un administrateur ne vous a pas encore attribué
        de rôle dans Convex. Demandez-lui d’ouvrir la table{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm">
          users
        </code>{" "}
        et de définir votre{" "}
        <code className="font-mono text-sm">role</code> sur{" "}
        <code className="font-mono text-sm">manager</code> ou{" "}
        <code className="font-mono text-sm">admin</code>.
      </p>
      <div className="flex gap-3">
        <SignOutButton>
          <button
            type="button"
            className="min-h-12 rounded-full bg-neutral-800 px-6 font-semibold text-white"
          >
            Se déconnecter
          </button>
        </SignOutButton>
        <Link
          href="/stats"
          className="flex min-h-12 items-center rounded-full bg-neutral-200 px-6 font-semibold"
        >
          Réessayer
        </Link>
      </div>
    </div>
  )
}

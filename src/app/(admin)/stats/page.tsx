"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"

export default function StatsPage() {
  const stats = useQuery(api.stats.get)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-champagne-deep">
          Statistiques
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Vue d’ensemble</h1>
        <p className="mt-2 text-neutral-500">
          Métadonnées cloud uniquement — les fichiers audio restent sur les
          boîtes DJ.
        </p>
      </header>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Bandes", stats.tapes],
              ["Cues", stats.cues],
              ["Cues blacklistés", stats.cuesBlacklisted],
              ["Bandes sans cues", stats.tapesWithoutCues],
              ["Playlists", stats.playlists],
              ["Playlists prêtes", stats.playlistsReady],
              ["Sous-catégories", stats.subcategories],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-[1.5rem] bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                {label}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-neutral-500">Chargement des statistiques…</p>
      )}
    </div>
  )
}

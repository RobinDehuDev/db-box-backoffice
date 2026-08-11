"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { SortableList } from "@/components/admin/SortableList"
import { CATEGORY_LABELS, isCategoryKey, type CategoryKey } from "@/lib/categories"

export default function SubcategoryPage() {
  const params = useParams<{ categoryKey: string; subcategoryId: string }>()
  const validCat = isCategoryKey(params.categoryKey ?? "")
  const categoryKey = (params.categoryKey ?? "") as CategoryKey
  const subcategoryId = params.subcategoryId as Id<"subcategories">

  const sub = useQuery(api.subcategories.get, { subcategoryId })
  const itemsRaw = useQuery(api.subcategories.listItems, { subcategoryId })
  const playlists = useQuery(api.playlists.list)
  const addPlaylist = useMutation(api.subcategories.addPlaylist)
  const removeItem = useMutation(api.subcategories.removeItem)
  const reorderItems = useMutation(api.subcategories.reorderItems)

  const [showAdd, setShowAdd] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const items = useMemo(() => {
    if (!itemsRaw) return []
    return itemsRaw.map((item) => ({ ...item, id: item._id }))
  }, [itemsRaw])

  const availablePlaylists = useMemo(() => {
    if (!playlists) return []
    const used = new Set(items.map((i) => i.playlistId))
    return playlists.filter((p) => !used.has(p._id))
  }, [items, playlists])

  if (!validCat) {
    return <p className="text-neutral-500">Catégorie inconnue.</p>
  }
  if (sub === undefined || itemsRaw === undefined) {
    return <p className="text-neutral-500">Chargement…</p>
  }
  if (sub === null) {
    return <p className="text-neutral-500">Sous-catégorie introuvable.</p>
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <Link
          href={`/categories/${categoryKey}`}
          className="text-sm font-semibold text-champagne-deep"
        >
          ← {CATEGORY_LABELS[categoryKey]}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{sub.name}</h1>
        <p className="mt-2 text-neutral-500">
          {sub.tag || "Sans tag"} · éléments de playlist ordonnés
        </p>
      </header>

      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Éléments</h2>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-neutral-800 px-4 text-sm font-semibold text-white"
          >
            <Plus className="size-4" />
            Ajouter une playlist
          </button>
        </div>

        {showAdd ? (
          <ul className="mt-4 max-h-60 space-y-2 overflow-y-auto rounded-2xl bg-neutral-50 p-3">
            {availablePlaylists.length === 0 ? (
              <li className="text-sm text-neutral-500">
                Aucune playlist disponible. Créez-en une dans Bandes.
              </li>
            ) : (
              availablePlaylists.map((pl) => (
                <li key={pl._id}>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold shadow-sm"
                    onClick={() => {
                      void addPlaylist({
                        subcategoryId,
                        playlistId: pl._id,
                      })
                        .then(() => {
                          setShowAdd(false)
                          setMessage(`« ${pl.name} » ajoutée`)
                        })
                        .catch((err: unknown) =>
                          setMessage(
                            err instanceof Error ? err.message : "Échec",
                          ),
                        )
                    }}
                  >
                    {pl.name}
                    <span className="mt-0.5 block text-xs font-normal text-neutral-400">
                      {pl.localFileKey ?? "Aucune bande"}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Aucun élément pour l’instant.
          </p>
        ) : (
          <div className="mt-4">
            <SortableList
              items={items}
              onReorder={(next) => {
                void reorderItems({
                  subcategoryId,
                  itemIds: next.map((i) => i._id),
                })
              }}
              renderItem={(item) => (
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="text-xs text-neutral-500">
                      {item.ready ? "Prête" : "Brouillon"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(`Retirer « ${item.title} » ?`)
                      )
                        return
                      void removeItem({ itemId: item._id })
                    }}
                    className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            />
          </div>
        )}
      </section>
    </div>
  )
}

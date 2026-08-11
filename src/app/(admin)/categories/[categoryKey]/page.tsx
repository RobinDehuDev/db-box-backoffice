"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { SortableList } from "@/components/admin/SortableList"
import {
  CATEGORY_LABELS,
  isCategoryKey,
  type CategoryKey,
} from "@/lib/categories"

export default function CategoryPage() {
  const params = useParams<{ categoryKey: string }>()
  const raw = params.categoryKey ?? ""
  const valid = isCategoryKey(raw)
  const categoryKey = raw as CategoryKey

  const subs = useQuery(
    api.subcategories.listByCategory,
    valid ? { categoryKey } : "skip",
  )
  const createSub = useMutation(api.subcategories.create)
  const updateSub = useMutation(api.subcategories.update)
  const removeSub = useMutation(api.subcategories.remove)
  const reorderSubs = useMutation(api.subcategories.reorder)

  const [query, setQuery] = useState("")
  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [editingId, setEditingId] = useState<Id<"subcategories"> | null>(null)
  const [editName, setEditName] = useState("")
  const [editTag, setEditTag] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const items = useMemo(() => {
    if (!subs) return []
    return subs.map((s) => ({ ...s, id: s._id }))
  }, [subs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (sub) =>
        sub.name.toLowerCase().includes(q) ||
        sub.tag.toLowerCase().includes(q),
    )
  }, [items, query])

  if (!valid) {
    return <p className="text-neutral-500">Catégorie inconnue.</p>
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-champagne-deep">
          Catégories
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {CATEGORY_LABELS[categoryKey]}
        </h1>
        <p className="mt-2 text-neutral-500">
          Gérez les sous-catégories de ce moment.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher des sous-catégories"
          className="min-h-12 w-full rounded-full border border-neutral-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-champagne-deep"
        />
      </div>

      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Sous-catégories</h2>
        {!subs ? (
          <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Aucune sous-catégorie pour l’instant.
          </p>
        ) : (
          <div className="mt-4">
            <SortableList
              items={query.trim() ? filtered : items}
              onReorder={(next) => {
                if (query.trim()) return
                void reorderSubs({
                  categoryKey,
                  subcategoryIds: next.map((s) => s._id),
                })
              }}
              renderItem={(sub) =>
                editingId === sub._id ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-h-10 flex-1 rounded-full bg-white px-4 text-sm"
                    />
                    <input
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      placeholder="Tag"
                      className="min-h-10 w-32 rounded-full bg-white px-4 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void updateSub({
                          subcategoryId: sub._id,
                          name: editName,
                          tag: editTag,
                        }).then(() => setEditingId(null))
                      }}
                      className="min-h-10 rounded-full bg-neutral-800 px-4 text-sm font-semibold text-white"
                    >
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <Link
                      href={`/categories/${categoryKey}/${sub._id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate font-semibold">{sub.name}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {sub.tag || "Sans tag"} · {sub.itemCount} éléments
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(sub._id)
                        setEditName(sub.name)
                        setEditTag(sub.tag)
                      }}
                      className="flex size-10 items-center justify-center rounded-full bg-white"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(`Supprimer « ${sub.name} » ?`)
                        )
                          return
                        void removeSub({ subcategoryId: sub._id })
                      }}
                      className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )
              }
            />
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Ajouter une sous-catégorie</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            className="min-h-12 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-5 text-sm"
          />
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Tag"
            className="min-h-12 w-40 rounded-full border border-neutral-200 bg-neutral-50 px-5 text-sm"
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => {
              void createSub({ categoryKey, name, tag })
                .then(() => {
                  setName("")
                  setTag("")
                  setMessage("Créé")
                })
                .catch((err: unknown) =>
                  setMessage(err instanceof Error ? err.message : "Échec"),
                )
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-neutral-800 px-5 font-semibold text-white disabled:opacity-50"
          >
            <Plus className="size-4" />
            Ajouter
          </button>
        </div>
      </section>
    </div>
  )
}

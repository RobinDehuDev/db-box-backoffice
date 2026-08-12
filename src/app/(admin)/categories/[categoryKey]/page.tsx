"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  ImageUploadField,
  uploadViaConvexStorage,
} from "@/components/admin/ImageUploadField"
import { SortableList } from "@/components/admin/SortableList"
import {
  CATEGORY_LABELS,
  isCategoryKey,
  type CategoryKey,
} from "@/lib/categories"
import type { CategoryTabRow, SubcategoryRow } from "@/lib/convex-rows"

export default function CategoryPage() {
  const params = useParams<{ categoryKey: string }>()
  const raw = params.categoryKey ?? ""
  const valid = isCategoryKey(raw)
  const categoryKey = raw as CategoryKey

  const ensureDefaults = useMutation(api.categoryTabs.ensureDefaults)
  const tabs = useQuery(
    api.categoryTabs.listByCategory,
    valid ? { categoryKey } : "skip",
  )
  const subs = useQuery(
    api.subcategories.listByCategory,
    valid ? { categoryKey } : "skip",
  )

  const createTab = useMutation(api.categoryTabs.create)
  const updateTab = useMutation(api.categoryTabs.update)
  const removeTab = useMutation(api.categoryTabs.remove)
  const reorderTabs = useMutation(api.categoryTabs.reorder)

  const createSub = useMutation(api.subcategories.create)
  const updateSub = useMutation(api.subcategories.update)
  const removeSub = useMutation(api.subcategories.remove)
  const reorderWithinTab = useMutation(api.subcategories.reorderWithinTab)
  const generateIconUploadUrl = useMutation(api.subcategories.generateIconUploadUrl)
  const setSubIcon = useMutation(api.subcategories.setIcon)
  const clearSubIcon = useMutation(api.subcategories.clearIcon)

  const [query, setQuery] = useState("")
  const [name, setName] = useState("")
  const [tabId, setTabId] = useState<Id<"categoryTabs"> | "">("")
  const [tabName, setTabName] = useState("")
  const [editingTabId, setEditingTabId] = useState<Id<"categoryTabs"> | null>(
    null,
  )
  const [editTabName, setEditTabName] = useState("")
  const [editingSubId, setEditingSubId] = useState<Id<"subcategories"> | null>(
    null,
  )
  const [editName, setEditName] = useState("")
  const [editTabId, setEditTabId] = useState<Id<"categoryTabs"> | "">("")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!valid) return
    void ensureDefaults({ categoryKey })
  }, [categoryKey, ensureDefaults, valid])

  useEffect(() => {
    if (tabs && tabs.length > 0 && !tabId) {
      setTabId(tabs[0]._id)
    }
  }, [tabs, tabId])

  const tabItems = useMemo((): CategoryTabRow[] => {
    if (!tabs) return []
    return tabs
  }, [tabs])

  const subsByTab = useMemo((): Array<{
    tab: CategoryTabRow
    subs: SubcategoryRow[]
  }> => {
    if (!subs || !tabs) return []
    return tabs.map((tab) => ({
      tab,
      subs: subs
        .filter((sub) => sub.tabId === tab._id)
        .filter((sub) => {
          const q = query.trim().toLowerCase()
          if (!q) return true
          return (
            sub.name.toLowerCase().includes(q) ||
            sub.tabName.toLowerCase().includes(q)
          )
        }),
    }))
  }, [subs, tabs, query])

  const uploadSubIcon = async (
    subcategoryId: Id<"subcategories">,
    file: File,
  ) => {
    await uploadViaConvexStorage(file, {
      generateUploadUrl: () => generateIconUploadUrl({}),
      setStorageId: async (storageId) => {
        await setSubIcon({
          subcategoryId,
          storageId: storageId as Id<"_storage">,
        })
      },
      clear: async () => {
        await clearSubIcon({ subcategoryId })
      },
    })
  }

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
          Gérez les onglets et sous-catégories de ce moment.
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
        <h2 className="text-lg font-semibold">Onglets</h2>
        {!tabs ? (
          <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
        ) : tabItems.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Aucun onglet.</p>
        ) : (
          <div className="mt-4">
            <SortableList<CategoryTabRow>
              items={tabItems}
              onReorder={(next) => {
                void reorderTabs({
                  categoryKey,
                  tabIds: next.map((tab) => tab._id),
                })
              }}
              renderItem={(tab) =>
                editingTabId === tab._id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      value={editTabName}
                      onChange={(e) => setEditTabName(e.target.value)}
                      className="min-h-10 flex-1 rounded-full bg-white px-4 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void updateTab({
                          tabId: tab._id,
                          name: editTabName,
                        }).then(() => setEditingTabId(null))
                      }}
                      className="min-h-10 rounded-full bg-neutral-800 px-4 text-sm font-semibold text-white"
                    >
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{tab.name}</p>
                      <p className="text-xs text-neutral-500">
                        {tab.subcategoryCount} sous-catégorie
                        {tab.subcategoryCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTabId(tab._id)
                        setEditTabName(tab.name)
                      }}
                      className="flex size-10 items-center justify-center rounded-full bg-white"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={tab.subcategoryCount > 0}
                      title={
                        tab.subcategoryCount > 0
                          ? "Retirez d’abord les sous-catégories"
                          : "Supprimer l’onglet"
                      }
                      onClick={() => {
                        if (!window.confirm(`Supprimer l’onglet « ${tab.name} » ?`))
                          return
                        void removeTab({ tabId: tab._id }).catch((err: unknown) =>
                          setMessage(
                            err instanceof Error ? err.message : "Échec",
                          ),
                        )
                      }}
                      className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-600 disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )
              }
            />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={tabName}
            onChange={(e) => setTabName(e.target.value)}
            placeholder="Nom du nouvel onglet"
            className="min-h-12 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-5 text-sm"
          />
          <button
            type="button"
            disabled={!tabName.trim()}
            onClick={() => {
              void createTab({ categoryKey, name: tabName })
                .then(() => {
                  setTabName("")
                  setMessage("Onglet créé")
                })
                .catch((err: unknown) =>
                  setMessage(err instanceof Error ? err.message : "Échec"),
                )
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-neutral-800 px-5 font-semibold text-white disabled:opacity-50"
          >
            <Plus className="size-4" />
            Ajouter un onglet
          </button>
        </div>
      </section>

      {subsByTab.map(({ tab, subs: tabSubs }) => (
        <section
          key={tab._id}
          className="rounded-[1.75rem] bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold">{tab.name}</h2>
          {tabSubs.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">
              Aucune sous-catégorie dans cet onglet.
            </p>
          ) : (
            <div className="mt-4">
              <SortableList<SubcategoryRow>
                items={tabSubs}
                onReorder={(next) => {
                  if (query.trim()) return
                  void reorderWithinTab({
                    tabId: tab._id,
                    subcategoryIds: next.map((s) => s._id),
                  })
                }}
                renderItem={(sub) =>
                  editingSubId === sub._id ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="min-h-10 flex-1 rounded-full bg-white px-4 text-sm"
                      />
                      <select
                        value={editTabId}
                        onChange={(e) =>
                          setEditTabId(e.target.value as Id<"categoryTabs">)
                        }
                        className="min-h-10 rounded-full bg-white px-4 text-sm"
                      >
                        {tabs?.map((t: CategoryTabRow) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          void updateSub({
                            subcategoryId: sub._id,
                            name: editName,
                            tabId:
                              editTabId && editTabId !== sub.tabId
                                ? editTabId
                                : undefined,
                          }).then(() => setEditingSubId(null))
                        }}
                        className="min-h-10 rounded-full bg-neutral-800 px-4 text-sm font-semibold text-white"
                      >
                        Enregistrer
                      </button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-neutral-200">
                        {sub.iconUrl ? (
                          <img
                            src={sub.iconUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-neutral-300">
                            <ImagePlus className="size-5" aria-hidden />
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/categories/${categoryKey}/${sub._id}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate font-semibold">{sub.name}</p>
                        <p className="truncate text-xs text-neutral-500">
                          {sub.itemCount} élément{sub.itemCount === 1 ? "" : "s"}
                        </p>
                      </Link>
                      <button
                        type="button"
                        title="Choisir une image"
                        onClick={() => {
                          const input = document.createElement("input")
                          input.type = "file"
                          input.accept = "image/png,image/jpeg,image/webp,image/gif"
                          input.onchange = () => {
                            const file = input.files?.[0]
                            if (file) void uploadSubIcon(sub._id, file)
                          }
                          input.click()
                        }}
                        className="flex size-10 items-center justify-center rounded-full bg-white"
                      >
                        <ImagePlus className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={!sub.iconUrl}
                        title="Supprimer l’image"
                        onClick={() => void clearSubIcon({ subcategoryId: sub._id })}
                        className="flex size-10 items-center justify-center rounded-full bg-white disabled:opacity-30"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubId(sub._id)
                          setEditName(sub.name)
                          setEditTabId(sub.tabId ?? tab._id)
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
      ))}

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Ajouter une sous-catégorie</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            className="min-h-12 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-5 text-sm"
          />
          <select
            value={tabId}
            onChange={(e) => setTabId(e.target.value as Id<"categoryTabs">)}
            className="min-h-12 rounded-full border border-neutral-200 bg-neutral-50 px-5 text-sm"
          >
            {tabs?.map((tab: CategoryTabRow) => (
              <option key={tab._id} value={tab._id}>
                {tab.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!name.trim() || !tabId}
            onClick={() => {
              if (!tabId) return
              void createSub({ categoryKey, name, tabId })
                .then(() => {
                  setName("")
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

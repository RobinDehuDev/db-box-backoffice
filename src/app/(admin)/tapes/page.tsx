"use client"

import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { ListMusic, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { StatusChip } from "@/components/admin/StatusChip"

export default function TapesPage() {
  const tapes = useQuery(api.tapes.list)
  const playlists = useQuery(api.playlists.list)
  const createTape = useMutation(api.tapes.create)
  const updateTape = useMutation(api.tapes.update)
  const removeTape = useMutation(api.tapes.remove)
  const createPlaylist = useMutation(api.playlists.create)
  const updatePlaylist = useMutation(api.playlists.update)
  const removePlaylist = useMutation(api.playlists.remove)

  const [localFileKey, setLocalFileKey] = useState("")
  const [title, setTitle] = useState("")
  const [playlistName, setPlaylistName] = useState("")
  const [playlistTapeId, setPlaylistTapeId] = useState<Id<"tapes"> | "">("")
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onCreateTape = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await createTape({
        localFileKey,
        title: title || localFileKey,
      })
      setLocalFileKey("")
      setTitle("")
      setMessage("Bande créée")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Échec")
    } finally {
      setBusy(false)
    }
  }

  const onCreatePlaylist = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await createPlaylist({
        name: playlistName,
        tapeId: playlistTapeId || null,
      })
      setPlaylistName("")
      setMessage("Playlist créée")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Échec")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-champagne-deep">
          Bibliothèque
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Bandes et playlists
        </h1>
        <p className="mt-2 text-neutral-500">
          Enregistrez des clés de fichiers locaux (nom ou chemin relatif). Aucun
          upload audio.
        </p>
      </header>

      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Ajouter une bande</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={localFileKey}
            onChange={(e) => setLocalFileKey(e.target.value)}
            placeholder="localFileKey (ex. mixes/soir.mp3)"
            className="min-h-12 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-5 text-sm"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre affiché"
            className="min-h-12 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-5 text-sm"
          />
          <button
            type="button"
            disabled={busy || !localFileKey.trim()}
            onClick={() => void onCreateTape()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-neutral-800 px-5 font-semibold text-white disabled:opacity-50"
          >
            <Plus className="size-4" />
            Ajouter
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Bandes</h2>
        {!tapes ? (
          <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
        ) : tapes.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Aucune bande pour l’instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {tapes.map((tape) => (
              <li
                key={tape._id}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{tape.title}</p>
                  <p className="truncate font-mono text-xs text-neutral-400">
                    {tape.localFileKey}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {tape.cueCount} cue{tape.cueCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/tapes/${tape._id}/cues`}
                    className="flex min-h-11 items-center gap-2 rounded-full bg-champagne-soft px-4 text-sm font-semibold text-champagne-deep"
                  >
                    <Pencil className="size-4" />
                    Cues
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const next = window.prompt("Titre", tape.title)
                      if (next == null) return
                      void updateTape({ tapeId: tape._id, title: next })
                    }}
                    className="min-h-11 rounded-full bg-neutral-100 px-4 text-sm font-semibold"
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Supprimer la bande « ${tape.title} » ?`,
                        )
                      )
                        return
                      void removeTape({ tapeId: tape._id })
                    }}
                    className="flex size-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Playlists</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Nom de la playlist"
            className="min-h-12 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-5 text-sm"
          />
          <select
            value={playlistTapeId}
            onChange={(e) =>
              setPlaylistTapeId(e.target.value as Id<"tapes"> | "")
            }
            className="min-h-12 rounded-full border border-neutral-200 bg-neutral-50 px-4 text-sm"
          >
            <option value="">Aucune bande</option>
            {(tapes ?? []).map((tape) => (
              <option key={tape._id} value={tape._id}>
                {tape.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !playlistName.trim()}
            onClick={() => void onCreatePlaylist()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-neutral-800 px-5 font-semibold text-white disabled:opacity-50"
          >
            <ListMusic className="size-4" />
            Ajouter une playlist
          </button>
        </div>

        {!playlists ? (
          <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
        ) : playlists.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Aucune playlist pour l’instant.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {playlists.map((pl) => (
              <li
                key={pl._id}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{pl.name}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {pl.tapeTitle
                      ? `${pl.tapeTitle} · ${pl.localFileKey}`
                      : "Aucune bande liée"}
                    {` · ${pl.cueCount} cues`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip
                    ready={pl.ready}
                    wipLabel="Brouillon"
                    readyLabel="Prête"
                    onToggle={() =>
                      void updatePlaylist({
                        playlistId: pl._id,
                        ready: !pl.ready,
                      })
                    }
                  />
                  {pl.tapeId ? (
                    <Link
                      href={`/tapes/${pl.tapeId}/cues`}
                      className="min-h-11 rounded-full bg-champagne-soft px-4 text-sm font-semibold text-champagne-deep leading-[2.75rem]"
                    >
                      Éditer les cues
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Supprimer la playlist « ${pl.name} » ?`,
                        )
                      )
                        return
                      void removePlaylist({ playlistId: pl._id })
                    }}
                    className="flex size-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

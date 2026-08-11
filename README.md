# Boîte à DJ — Backoffice

Next.js + Clerk + Convex app for managers to edit **subcategories** and **song cues** online.

## Important

- **Audio stays local** on DJ boxes. This app never uploads or streams mix files.
- Cloud data is **metadata only** (tapes keyed by `localFileKey`, cues, playlists, subcategories).
- **Electron import** of this data is a separate project (not included here).

## Setup

1. Install deps: `pnpm install`
2. Create a [Clerk](https://clerk.com) application. Add a JWT template named **`convex`** with `"aud": "convex"`.
3. Create a Convex project from this folder:
   ```bash
   pnpm exec convex dev
   ```
   Set Convex env `CLERK_JWT_ISSUER_DOMAIN` to your Clerk Frontend API URL (e.g. `https://xxx.clerk.accounts.dev`).
4. Copy `.env.example` → `.env.local` and fill values.
5. Run `pnpm dev` (http://localhost:3000).
6. After a user signs in once, grant access in the Convex dashboard: Data → **users** → set `role` to `manager` or `admin`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm exec convex dev` | Convex sync + codegen |
| `pnpm build` | Production build |

## Roles

Access is controlled in Convex, not Clerk metadata. First sign-in creates a `users` row with no role. Only rows with `role` `manager` or `admin` can use the dashboard; everyone else sees `/denied`.

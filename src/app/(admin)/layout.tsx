"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import {
  BarChart3,
  Clapperboard,
  FolderOpen,
  HelpCircle,
  Mic2,
  Music2,
  Sparkles,
  Wine,
} from "lucide-react"
import { BrandMark } from "@/components/BrandMark"
import { RoleGate } from "@/components/RoleGate"
import { CATEGORY_LABELS, type CategoryKey } from "@/lib/categories"
import { cn } from "@/lib/utils"

const navMain = [
  { href: "/stats", end: true, icon: BarChart3, label: "Statistiques" },
  { href: "/tapes", end: false, icon: FolderOpen, label: "Bandes" },
] as const

const navCategories: Array<{
  href: string
  icon: typeof Sparkles
  categoryKey: CategoryKey
}> = [
  { href: "/categories/tempsForts", icon: Sparkles, categoryKey: "tempsForts" },
  { href: "/categories/danceFloor", icon: Music2, categoryKey: "danceFloor" },
  { href: "/categories/cocktail", icon: Wine, categoryKey: "cocktail" },
  { href: "/categories/karaoke", icon: Mic2, categoryKey: "karaoke" },
  { href: "/categories/blindTest", icon: HelpCircle, categoryKey: "blindTest" },
  {
    href: "/categories/burgerQuiz",
    icon: Clapperboard,
    categoryKey: "burgerQuiz",
  },
]

function NavItem({
  href,
  end,
  icon: Icon,
  label,
}: {
  href: string
  end?: boolean
  icon: typeof BarChart3
  label: string
}) {
  const pathname = usePathname()
  const active = end
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold touch-manipulation",
        active
          ? "bg-champagne-soft text-champagne-deep"
          : "text-neutral-600",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  )
}

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGate>
      <div className="flex h-screen overflow-hidden bg-[#F4F4F5] text-neutral-900">
        <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200/80 bg-white">
          <div className="flex items-center gap-3 px-5 py-5">
            <BrandMark className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                Boîte à DJ
              </p>
              <p className="text-xs text-champagne-deep">Backoffice</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
            {navMain.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}

            <p className="mb-1 mt-4 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-champagne-deep">
              Catégories
            </p>
            {navCategories.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={CATEGORY_LABELS[item.categoryKey]}
              />
            ))}
          </nav>

          <div className="flex items-center justify-between gap-3 border-t border-neutral-100 p-4">
            <p className="text-xs text-neutral-400">Métadonnées uniquement</p>
            <UserButton />
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="h-full min-h-0">{children}</div>
        </main>
      </div>
    </RoleGate>
  )
}

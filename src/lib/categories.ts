export const CATEGORY_KEYS = [
  "tempsForts",
  "danceFloor",
  "cocktail",
  "karaoke",
  "blindTest",
  "burgerQuiz",
] as const

export type CategoryKey = (typeof CATEGORY_KEYS)[number]

export function isCategoryKey(value: string): value is CategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(value)
}

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  tempsForts: "Temps forts",
  danceFloor: "Piste de danse",
  cocktail: "Cocktail",
  karaoke: "Karaoké",
  blindTest: "Blind test",
  burgerQuiz: "Burger quiz",
}

export type AppRole = "manager" | "admin"

export function isAppRole(value: unknown): value is AppRole {
  return value === "manager" || value === "admin"
}

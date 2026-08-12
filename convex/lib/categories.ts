import { v } from "convex/values"

export const categoryKey = v.union(
  v.literal("tempsForts"),
  v.literal("danceFloor"),
  v.literal("cocktail"),
  v.literal("karaoke"),
  v.literal("blindTest"),
  v.literal("burgerQuiz"),
)

export type CategoryKey =
  | "tempsForts"
  | "danceFloor"
  | "cocktail"
  | "karaoke"
  | "blindTest"
  | "burgerQuiz"

import { query } from "./_generated/server"

/** Public ping — no auth (health / deploy check). */
export const ping = query({
  args: {},
  handler: async () => ({ ok: true as const }),
})

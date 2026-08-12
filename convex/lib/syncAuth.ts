export function requireSyncApiKey(apiKey: string): void {
  const expected = process.env.SYNC_API_KEY
  if (!expected || expected.length === 0) {
    throw new Error("SYNC_API_KEY non configuré sur le déploiement Convex")
  }
  if (apiKey !== expected) {
    throw new Error("Clé de synchronisation invalide")
  }
}

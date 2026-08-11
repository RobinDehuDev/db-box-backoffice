/**
 * Clerk JWT issuer — set CLERK_JWT_ISSUER_DOMAIN in Convex dashboard
 * (e.g. https://your-app.clerk.accounts.dev).
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
}

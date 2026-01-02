export default {
  providers: [
    {
      // Configure Clerk JWT verification for Convex auth.
      // CLERK_JWT_ISSUER example: https://<your-app>.clerk.accounts.dev
      // CLERK_JWT_AUDIENCE should match your Clerk JWT template audience (often "convex")
      // Fallback to the frontend API env if issuer is not provided explicitly.
      domain:
        process.env.CLERK_JWT_ISSUER ||
        process.env.CLERK_FRONTEND_API ||
        process.env.NEXT_PUBLIC_CLERK_FRONTEND_API ||
        process.env.VITE_CLERK_FRONTEND_API,
      applicationID: process.env.CLERK_JWT_AUDIENCE || "convex",
    },
  ],
};

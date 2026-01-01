export default {
  providers: [
    {
      // Configure Clerk JWT verification for Convex auth
      // CLERK_JWT_ISSUER example: https://YOUR-CLERK-INSTANCE.clerk.accounts.dev
      // CLERK_JWT_AUDIENCE should match your Clerk JWT template audience (often "convex")
      domain: process.env.CLERK_JWT_ISSUER,
      applicationID: process.env.CLERK_JWT_AUDIENCE,
    },
  ],
};

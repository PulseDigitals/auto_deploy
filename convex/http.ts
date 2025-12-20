import { httpRouter } from "convex/server";
import { startVercelOAuth, handleVercelCallback } from "./oauth/vercel.js";

const http = httpRouter();

// Vercel OAuth routes - Production endpoints
http.route({
  path: "/auth/vercel/start",
  method: "GET",
  handler: startVercelOAuth,
});

http.route({
  path: "/auth/vercel/callback",
  method: "GET",
  handler: handleVercelCallback,
});

export default http;

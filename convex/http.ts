import { httpRouter } from "convex/server";
import { startVercelOAuth, handleVercelCallback } from "./oauth/vercel.js";

const http = httpRouter();

// Vercel OAuth routes
http.route({
  path: "/api/oauth/vercel/start",
  method: "GET",
  handler: startVercelOAuth,
});

http.route({
  path: "/api/oauth/vercel/callback",
  method: "GET",
  handler: handleVercelCallback,
});

export default http;

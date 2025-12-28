import { httpRouter, type PublicHttpAction } from "convex/server";
import { startVercelOAuth } from "./oauth/vercel";
import { handleCentralCallback } from "./gateway.node";

const http = httpRouter();

http.route({
  path: "/auth/vercel/start",
  method: "GET",
  handler: startVercelOAuth,
});

http.route({
  path: "/oauth/callback",
  method: "GET",
  handler: handleCentralCallback as unknown as PublicHttpAction,
});

export default http;

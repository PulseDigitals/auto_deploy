import { httpRouter } from "convex/server";
import { startVercelOAuth } from "./oauth/vercel";
import { handleCentralCallback } from "./gateway.node";
import { startHerculesLogin, handleHerculesCallback } from "./herculesGateway.node";

const http = httpRouter();

http.route({
  path: "/auth/vercel/start",
  method: "GET",
  handler: startVercelOAuth,
});

http.route({
  path: "/auth/hercules/start",
  method: "GET",
  handler: startHerculesLogin,
});

http.route({
  path: "/auth/hercules/callback",
  method: "GET",
  handler: handleHerculesCallback,
});

http.route({
  path: "/oauth/callback",
  method: "GET",
  handler: handleCentralCallback,
});

export default http;

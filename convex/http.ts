import { httpRouter, type PublicHttpAction } from "convex/server";
import { handleCentralCallback } from "./gateway.node";

const http = httpRouter();

http.route({
  path: "/oauth/callback",
  method: "GET",
  handler: handleCentralCallback as unknown as PublicHttpAction,
});

export default http;

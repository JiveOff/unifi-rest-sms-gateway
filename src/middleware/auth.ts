import type { Elysia } from "elysia";
import { appEnv } from "../env";

export const apiKeyAuth = (app: Elysia) =>
  app.onBeforeHandle(({ headers, set }) => {
    if (!appEnv.API_KEY) {
      // If no API key is configured, allow all requests
      return;
    }

    const authHeader = headers.authorization || headers["x-api-key"];

    if (!authHeader) {
      set.status = 401;
      return { error: "Unauthorized", message: "API key required" };
    }

    // Support both "Bearer <key>" and direct key
    const providedKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (providedKey !== appEnv.API_KEY) {
      set.status = 401;
      return { error: "Unauthorized", message: "Invalid API key" };
    }
  });

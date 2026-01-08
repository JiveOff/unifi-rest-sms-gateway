import { staticPlugin } from "@elysiajs/static";
import consola from "consola";
import { Elysia, NotFoundError } from "elysia";
import { z } from "zod";
import { session } from "./clients/ssh";
import { appEnv } from "./env";
import { apiKeyAuth } from "./middleware/auth";
import {
  ClearMessagesResponseSchema,
  MessageCountResponseSchema,
  MessageIndexParamsSchema,
  SendMessageResponseSchema,
  SendSmsSchema,
  SimInfoSchema,
  SmsMessageSchema,
} from "./schemas";
import { getSimInfo } from "./services/sim";
import {
  clearAllMessages,
  getAllMessages,
  getMessageCount,
  getOneMessage,
  sendMessage,
} from "./services/sms";
import { websocketHandler } from "./services/websocket";
await session;

const app = new Elysia();

// Optionally serve the web UI (not protected by API key)
if (appEnv.ENABLE_WEB_UI) {
  app.use(
    staticPlugin({
      assets: "public",
      prefix: "/",
    }),
  );
  consola.info("📄 Web UI enabled at /");
}

// WebSocket endpoint for real-time SMS monitoring (uses message-based auth, not HTTP headers)
// Client must send authentication message first: { "type": "auth", "apiKey": "YOUR_KEY" }
app.ws("/messages/monitor", websocketHandler);

// Apply API key authentication to REST API routes only
app
  .use(apiKeyAuth)
  .get(
    "/info",
    async () => {
      return getSimInfo();
    },
    {
      response: SimInfoSchema,
    },
  )
  .get(
    "/messages",
    async () => {
      return getAllMessages();
    },
    {
      response: z.array(SmsMessageSchema),
    },
  )
  .get(
    "/messages/count",
    async () => {
      const count = await getMessageCount();
      return { count };
    },
    {
      response: MessageCountResponseSchema,
    },
  )
  .get(
    "/messages/latest",
    async () => {
      const count = await getMessageCount();
      if (count === 0) {
        throw new NotFoundError("No messages found");
      }
      const lastMessage = await getOneMessage(count - 1);
      if (!lastMessage) {
        throw new NotFoundError("Message not found");
      }
      return lastMessage;
    },
    {
      response: SmsMessageSchema,
    },
  )
  .get(
    "/messages/:index",
    async ({ params }) => {
      const message = await getOneMessage(params.index);
      if (!message) {
        throw new NotFoundError("Message not found");
      }
      return message;
    },
    {
      params: MessageIndexParamsSchema,
      response: SmsMessageSchema,
    },
  )
  .delete(
    "/messages",
    async () => {
      const count = await clearAllMessages();
      return { success: true, cleared: count };
    },
    {
      response: ClearMessagesResponseSchema,
    },
  )
  .post(
    "/messages",
    async ({ body }) => {
      await sendMessage(body.number, body.content);
      return { success: true, message: "SMS sent successfully" };
    },
    {
      body: SendSmsSchema,
      response: SendMessageResponseSchema,
    },
  )
  .listen(appEnv.PORT);

consola.info(
  `🚀 Server running at ${app.server?.hostname}:${app.server?.port}`,
);

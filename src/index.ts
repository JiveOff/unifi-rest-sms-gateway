import { Elysia } from "elysia";

import { getSimInfo } from "./service";

const app = new Elysia()
  .get("/sim/info", async () => {
    return getSimInfo();
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

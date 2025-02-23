import fastify from "fastify";
import { AsyncLocalStorage } from "async_hooks";
const server = fastify();

const asyncStorage = new AsyncLocalStorage<Map<string, any>>();

export function setRequestContext(userId: string) {
  asyncStorage.run(new Map(), () => {
    const store = asyncStorage.getStore();
    if (store) {
      store.set("userID", userId);
    }
  });
}

export function getRequestContext(): { userId: string } {
  const store = asyncStorage.getStore();
  return {
    userId: store?.get("userId") || "AFRICA",
  };
}

server.addHook("preHandler", async (request, reply) => {
  const userId = (request.headers["x-user-id"] as string) || "empty";
  setRequestContext(userId);
});

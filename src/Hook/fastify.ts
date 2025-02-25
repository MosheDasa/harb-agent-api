import { AsyncLocalStorage } from "async_hooks";

const asyncStorage = new AsyncLocalStorage<Map<string, any>>();

export function setRequestContext(
  userId: string,
  clientId: string,
  requestId: string
) {
  const store = asyncStorage.getStore();
  if (store) {
    store.set("userId", userId);
    store.set("clientId", clientId);
    store.set("requestId", requestId);
  } else {
    console.error("No store available to set context.");
  }
}

export function getRequestContext(): {
  userId?: string;
  clientId?: string;
  requestId?: string;
} {
  const store = asyncStorage.getStore();
  const userId = store?.get("userId");
  const clientId = store?.get("clientId");
  const requestId = store?.get("requestId");
  return { userId, clientId, requestId };
}

export { asyncStorage };

import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { KumbaWireHttp } from "../../generated/wire.ts";
import { account } from "./account.ts";

const loginPaths = ["/auth/sign-in", "/auth/register"];

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export const api = createHttpClient<KumbaWireHttp>({
  baseUrl: "/api",
  fetch: ((input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, init).then((response) => {
      const path = new URL(requestUrl(input), "http://127.0.0.1").pathname;
      // A stale or missing session should drop the signed-in label. A wrong
      // password on the login form is also UNAUTHORIZED, and that stays a form error.
      if (response.status === 401 && !loginPaths.some((p) => path.endsWith(p))) {
        account.value = null;
      }
      return response;
    });
  }) as typeof fetch,
});

export type Output<Path extends keyof KumbaWireHttp> = KumbaWireHttp[Path]["output"];

const fallbacks: Record<string, string> = {
  UNAUTHORIZED: "Please sign in first.",
  FORBIDDEN: "You are not allowed to do that.",
  NOT_FOUND: "That could not be found.",
  CONFLICT: "That clashes with what is already there.",
  INVALID_REQUEST: "Please check what you entered.",
  NETWORK_ERROR: "Kumba cannot be reached right now. Check your connection and try again.",
  UNAVAILABLE: "Kumba cannot be reached right now. Please try again shortly.",
};

/**
 * The server only says which kind of error happened, such as CONFLICT, so each
 * caller supplies the sentence that kind means for its own request.
 */
export function explain(error: string, messages: Record<string, string> = {}): string {
  return messages[error] ?? fallbacks[error] ?? "Something went wrong on our side. Please try again.";
}

import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { KumbaWireHttp } from "../../generated/wire.ts";

export const api = createHttpClient<KumbaWireHttp>({ baseUrl: "/api" });

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

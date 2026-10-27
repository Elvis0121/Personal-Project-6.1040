import { reviewer } from "./account.ts";

const KEY = "kumba-next";

export function rememberNext(hash: string) {
  sessionStorage.setItem(KEY, hash);
}

export function takeNext(fallback = "#/homes") {
  const next = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  if (reviewer.value) return "#/review";
  if (next && next.startsWith("#/") && !next.startsWith("#/sign-") && next !== "#/") return next;
  return fallback;
}

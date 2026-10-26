import { account, reviewer } from "./account.ts";
import { api } from "./api.ts";

export { account, reviewer };

/** Bumps when a form signs in so a late /auth/current cannot wipe the new session. */
let generation = 0;

export function beginSession() {
  generation += 1;
}

export async function loadAccount() {
  const mine = generation;
  const result = await api.auth.current({});
  if (mine !== generation) return;
  account.value = "error" in result ? null : result.account;
  await loadReviewer();
}

export async function loadReviewer() {
  if (!account.value) {
    reviewer.value = false;
    return;
  }
  const result = await api.review.access({});
  reviewer.value = !("error" in result) && result.access.appointed === true;
}

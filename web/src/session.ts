import { account, reviewer } from "./account.ts";
import { api } from "./api.ts";

export { account, reviewer };

export async function loadAccount() {
  const result = await api.auth.current({});
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

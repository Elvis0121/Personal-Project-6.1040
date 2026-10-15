import { ref } from "vue";
import { api } from "./api.ts";

/** The signed-in account's username, or null when nobody is signed in. */
export const account = ref<string | null>(null);

export async function loadAccount() {
  const result = await api.auth.current({});
  account.value = "error" in result ? null : result.account;
}

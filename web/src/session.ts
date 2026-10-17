import { account } from "./account.ts";
import { api } from "./api.ts";

export { account };

export async function loadAccount() {
  const result = await api.auth.current({});
  account.value = "error" in result ? null : result.account;
}

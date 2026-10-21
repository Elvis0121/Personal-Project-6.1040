import { ref } from "vue";

/** The signed-in account's username, or null when nobody is signed in. */
export const account = ref<string | null>(null);

/** True only for the appointed reviewer. Cleared with the account. */
export const reviewer = ref(false);

<script setup lang="ts">
import { ref } from "vue";
import { api, explain } from "../api.ts";
import { account, beginSession, loadReviewer } from "../session.ts";

const props = defineProps<{ mode: "sign-in" | "register" }>();
const emit = defineEmits<{ ok: [] }>();

const username = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

function originHint() {
  const here = location.origin;
  if (here.includes("localhost")) {
    return "This page is localhost. Open it as http://127.0.0.1:8080 so the session cookie can stick.";
  }
  if (here.endsWith(".mit-sdg.dev")) {
    return `Sign-in is refused from ${here}. PUBLIC_ORIGIN on the server must match this address exactly, with https and no trailing slash.`;
  }
  return `Sign-in is refused from ${here}. Open the exact address the server was configured for.`;
}

async function submit() {
  error.value = "";
  busy.value = true;
  const input = { username: username.value.trim(), password: password.value };
  const options = { timeoutMs: 15_000 };
  try {
    const result =
      props.mode === "register"
        ? await api.auth.register(input, options)
        : await api.auth["sign-in"](input, options);
    if ("error" in result) {
      error.value = explain(result.error, {
        INVALID_REQUEST:
          "Usernames are 3 to 32 letters, numbers, underscores, or hyphens, and passwords are 8 to 128 characters.",
        CONFLICT: "That username is taken. Try another, or log in instead.",
        UNAUTHORIZED: "The username or password is incorrect.",
        FORBIDDEN: originHint(),
        TIMED_OUT: "Kumba did not answer. Is the backend still running on port 3000?",
      });
      return;
    }
    beginSession();
    account.value = result.account;
    password.value = "";
    await loadReviewer();
    emit("ok");
  } catch {
    error.value = explain("NETWORK_ERROR");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <label>
      Username
      <input v-model="username" autocomplete="username" required />
    </label>
    <label>
      Password
      <input
        v-model="password"
        type="password"
        :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
        required
      />
    </label>
    <p v-if="mode === 'register'" class="muted">
      Usernames 3 to 32 characters. Password 8 to 128. A short phrase is easier than a scrambled word.
    </p>
    <button :disabled="busy">{{ mode === "register" ? "Create account" : "Log in" }}</button>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </form>
</template>

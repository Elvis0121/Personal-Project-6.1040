<script setup lang="ts">
import { ref } from "vue";
import { api, explain } from "../api.ts";
import { account, loadReviewer } from "../session.ts";

const props = defineProps<{ mode: "sign-in" | "register" }>();
const emit = defineEmits<{ ok: [] }>();

const username = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function submit() {
  error.value = "";
  busy.value = true;
  const input = { username: username.value.trim(), password: password.value };
  const result =
    props.mode === "register" ? await api.auth.register(input) : await api.auth["sign-in"](input);
  busy.value = false;
  if ("error" in result) {
    error.value = explain(result.error, {
      INVALID_REQUEST:
        "Usernames are 3 to 32 letters, numbers, underscores, or hyphens, and passwords are 8 to 128 characters.",
      CONFLICT: "That username is taken. Try another, or log in instead.",
      UNAUTHORIZED: "The username or password is incorrect.",
    });
    return;
  }
  account.value = result.account;
  password.value = "";
  await loadReviewer();
  emit("ok");
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

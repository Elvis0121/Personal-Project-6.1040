<script setup lang="ts">
import { ref } from "vue";
import { api, explain } from "../api.ts";
import { account, loadReviewer, reviewer } from "../session.ts";

const mode = ref<"sign-in" | "register">("sign-in");
const username = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function submit() {
  error.value = "";
  busy.value = true;
  const input = { username: username.value.trim(), password: password.value };
  const result =
    mode.value === "register" ? await api.auth.register(input) : await api.auth["sign-in"](input);
  busy.value = false;
  if ("error" in result) {
    error.value = explain(result.error, {
      INVALID_REQUEST:
        "Usernames are 3 to 32 letters, numbers, underscores, or hyphens, and passwords are 8 to 128 characters.",
      CONFLICT: "That username is taken. Try another, or sign in instead.",
      UNAUTHORIZED: "The username or password is incorrect.",
    });
    return;
  }
  account.value = result.account;
  password.value = "";
  await loadReviewer();
}

async function signOut() {
  await api.auth["sign-out"]({});
  account.value = null;
  reviewer.value = false;
}
</script>

<template>
  <div v-if="account" class="account">
    <span>Signed in as <strong>{{ account }}</strong></span>
    <button class="link" @click="signOut">Sign out</button>
  </div>
  <form v-else class="account-form" @submit.prevent="submit">
    <input v-model="username" placeholder="Username" autocomplete="username" required />
    <input
      v-model="password"
      type="password"
      placeholder="Password"
      :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
      required
    />
    <button :disabled="busy">{{ mode === "register" ? "Create account" : "Sign in" }}</button>
    <button
      type="button"
      class="link"
      @click="(mode = mode === 'register' ? 'sign-in' : 'register'), (error = '')"
    >
      {{ mode === "register" ? "I have an account" : "New here? Create an account" }}
    </button>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </form>
</template>

<script setup lang="ts">
import { watch } from "vue";
import AuthForm from "../components/AuthForm.vue";
import AuthShell from "../components/AuthShell.vue";
import { takeNext } from "../auth-next.ts";
import { account } from "../session.ts";

watch(
  account,
  (name) => {
    if (name) location.hash = takeNext();
  },
  { immediate: true },
);
</script>

<template>
  <AuthShell v-if="!account">
    <section class="auth-page card">
      <h1>Log in</h1>
      <p class="muted">Your search, or your listing. One account, when you are ready.</p>
      <AuthForm mode="sign-in" />
      <p>New here? <a href="#/sign-up">Create an account</a>.</p>
    </section>
  </AuthShell>
</template>

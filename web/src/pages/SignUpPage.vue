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
      <h1>Create your account</h1>
      <p class="muted">
        Look for a place, or list one. Free either way. An account is only for the next step.
      </p>
      <AuthForm mode="register" />
      <p>Already have an account? <a href="#/sign-in">Log in</a>.</p>
    </section>
  </AuthShell>
</template>

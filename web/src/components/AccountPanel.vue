<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { api } from "../api.ts";
import { account, reviewer } from "../session.ts";

const open = ref(false);
const root = ref<HTMLElement | null>(null);

async function signOut() {
  open.value = false;
  await api.auth["sign-out"]({});
  account.value = null;
  reviewer.value = false;
  location.hash = "#/";
}

function close() {
  open.value = false;
}

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close();
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  window.addEventListener("hashchange", close);
  window.addEventListener("keydown", onKey);
});
onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
  window.removeEventListener("hashchange", close);
  window.removeEventListener("keydown", onKey);
});
watch(account, () => {
  if (!account.value) open.value = false;
});
</script>

<template>
  <div v-if="account" ref="root" class="account">
    <span class="account-name">{{ account }}</span>
    <button
      type="button"
      class="account-toggle"
      :aria-expanded="open"
      aria-controls="account-menu"
      :aria-label="open ? 'Close account menu' : 'Open account menu'"
      @click.stop="open = !open"
    >
      <span v-if="open" class="account-x" aria-hidden="true">×</span>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
    <div v-if="open" id="account-menu" class="account-menu">
      <nav class="account-links">
        <template v-if="reviewer">
          <a href="#/review">Review</a>
        </template>
        <template v-else>
          <a href="#/liked">Liked places</a>
          <a href="#/mine">My homes</a>
        </template>
      </nav>
      <button type="button" class="secondary" @click="signOut">Sign out</button>
    </div>
  </div>
</template>

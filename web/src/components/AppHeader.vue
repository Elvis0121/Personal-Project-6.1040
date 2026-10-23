<script setup lang="ts">
import AccountPanel from "./AccountPanel.vue";
import BrandMark from "./BrandMark.vue";
import { rememberNext } from "../auth-next.ts";
import { account } from "../session.ts";

defineProps<{
  page: "landing" | "search" | "listing" | "liked" | "mine" | "review" | "sign-in" | "sign-up";
}>();
</script>

<template>
  <header>
    <a :href="account ? '#/homes' : '#/'" class="brand">
      <BrandMark />
      <span class="brand-name">Kumba</span>
    </a>
    <nav>
      <a href="#/homes" :class="{ current: page === 'search' || page === 'listing' }">Find your home</a>
      <a
        href="#/mine"
        :class="{ current: page === 'mine' }"
        @click="account ? undefined : rememberNext('#/mine')"
      >
        {{ account ? "My homes" : "List a place" }}
      </a>
      <a v-if="account" href="#/review" :class="{ current: page === 'review' }">Review</a>
    </nav>
    <AccountPanel />
    <div v-if="!account && page !== 'sign-in' && page !== 'sign-up'" class="header-auth">
      <a href="#/sign-in">Log in</a>
      <a class="as-button header-signup" href="#/sign-up">Sign up</a>
    </div>
  </header>
</template>

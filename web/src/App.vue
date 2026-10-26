<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import AppHeader from "./components/AppHeader.vue";
import GuestMedia from "./components/GuestMedia.vue";
import LandingPage from "./pages/LandingPage.vue";
import LikedPlacesPage from "./pages/LikedPlacesPage.vue";
import ListingPage from "./pages/ListingPage.vue";
import MyListingsPage from "./pages/MyListingsPage.vue";
import ReviewPage from "./pages/ReviewPage.vue";
import SearchPage from "./pages/SearchPage.vue";
import SignInPage from "./pages/SignInPage.vue";
import SignUpPage from "./pages/SignUpPage.vue";
import { account } from "./account.ts";
import { pageFromHash } from "./route.ts";
import { loadAccount, reviewer } from "./session.ts";

const hash = ref(location.hash);
const ready = ref(false);
const syncHash = () => (hash.value = location.hash);
const page = computed(() => pageFromHash(hash.value));
const guestLanding = computed(() => page.value.name === "landing" && !account.value);
const headerPage = computed(() =>
  page.value.name === "landing" && account.value ? "search" : page.value.name,
);

watch(
  [account, page, ready],
  () => {
    if (!ready.value) return;
    if (account.value && page.value.name === "landing") location.hash = "#/homes";
    if (!account.value && (page.value.name === "mine" || page.value.name === "review")) {
      location.hash = "#/";
    }
  },
);

onMounted(async () => {
  window.addEventListener("hashchange", syncHash);
  await loadAccount();
  ready.value = true;
});
onUnmounted(() => window.removeEventListener("hashchange", syncHash));
</script>

<template>
  <div :class="{ 'guest-shell': guestLanding, 'app-shell': !guestLanding }">
    <GuestMedia v-if="guestLanding" />
    <AppHeader :page="headerPage" :reviewer="reviewer" />
    <main>
      <LandingPage v-if="guestLanding" />
      <SearchPage v-else-if="page.name === 'search' || page.name === 'landing'" />
      <ListingPage v-else-if="page.name === 'listing'" :listing="page.listing" />
      <LikedPlacesPage v-else-if="page.name === 'liked'" />
      <MyListingsPage v-else-if="page.name === 'mine'" />
      <ReviewPage v-else-if="page.name === 'review'" />
      <SignInPage v-else-if="page.name === 'sign-in'" />
      <SignUpPage v-else-if="page.name === 'sign-up'" />
    </main>
  </div>
</template>

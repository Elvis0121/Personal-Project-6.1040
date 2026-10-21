<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import AccountPanel from "./components/AccountPanel.vue";
import ListingPage from "./pages/ListingPage.vue";
import MyListingsPage from "./pages/MyListingsPage.vue";
import ReviewPage from "./pages/ReviewPage.vue";
import SearchPage from "./pages/SearchPage.vue";
import { loadAccount, reviewer } from "./session.ts";

/** Pages are addressed by the URL hash: #/ search, #/listing/<id> one place, #/mine listings, #/review the queue. */
const hash = ref(location.hash);
const syncHash = () => (hash.value = location.hash);

const page = computed(() => {
  const listing = hash.value.match(/^#\/listing\/(.+)$/);
  if (listing) return { name: "listing" as const, listing: decodeURIComponent(listing[1]!) };
  if (hash.value === "#/mine") return { name: "mine" as const };
  if (hash.value === "#/review") return { name: "review" as const };
  return { name: "search" as const };
});

onMounted(() => {
  window.addEventListener("hashchange", syncHash);
  loadAccount();
});
onUnmounted(() => window.removeEventListener("hashchange", syncHash));
</script>

<template>
  <header>
    <a href="#/" class="brand">Kumba</a>
    <nav>
      <a href="#/">Find a place</a>
      <a href="#/mine">My listings</a>
      <a v-if="reviewer" href="#/review">Review</a>
    </nav>
    <AccountPanel />
  </header>
  <main>
    <ListingPage v-if="page.name === 'listing'" :listing="page.listing" />
    <MyListingsPage v-else-if="page.name === 'mine'" />
    <ReviewPage v-else-if="page.name === 'review'" />
    <SearchPage v-else />
  </main>
</template>

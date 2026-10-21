<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { api, explain, type Output } from "../api.ts";
import PageBand from "../components/PageBand.vue";
import PropertyCard from "../components/PropertyCard.vue";
import SearchForm from "../components/SearchForm.vue";
import { account } from "../session.ts";
import type { GalleryShot } from "../gallery.ts";

type Results = (Output<"/listings/search">["results"]["listings"][number] & {
  displayPhoto?: string | null;
  photos?: GalleryShot[];
})[];

const PREVIEW = 10;

const area = ref("");
const maxRent = ref<number | "">("");
const types = ref<string[]>([]);
const results = ref<Results>([]);
const error = ref("");
const searched = ref(false);
const expanded = ref(false);
const lastQuery = ref<{ area: string; maxRent: number } | null>(null);

const matches = computed(() =>
  types.value.length === 0 ? results.value : results.value.filter((item) => types.value.includes(item.kind)),
);
const shown = computed(() => (expanded.value ? matches.value : matches.value.slice(0, PREVIEW)));
const hiddenCount = computed(() => Math.max(0, matches.value.length - PREVIEW));

async function fetchResults(query: { area: string; maxRent: number }) {
  const result = await api.listings.search(query);
  searched.value = true;
  if ("error" in result) {
    error.value = explain(result.error, { INVALID_REQUEST: "Enter a maximum rent of zero or more." });
    return;
  }
  error.value = "";
  results.value = result.results.listings;
}

async function search() {
  expanded.value = false;
  const query = {
    area: area.value,
    maxRent: maxRent.value === "" ? Number.MAX_SAFE_INTEGER : Number(maxRent.value),
  };
  lastQuery.value = query;
  await fetchResults(query);
}

onMounted(search);
const poll = setInterval(() => {
  if (lastQuery.value) fetchResults(lastQuery.value);
}, 4000);
onUnmounted(() => clearInterval(poll));
</script>

<template>
  <div class="search-page">
    <PageBand
      src="/stand-ins/cottage.jpg"
      :eyebrow="account ? `Welcome back, ${account}` : 'For you'"
      title="Find your home"
      :lede="
        account
          ? 'You already know what you need. Costs sit on every card. Ask when it feels right.'
          : 'Walk through the rooms. Compare without an account. The next place is allowed to take its time.'
      "
    />
    <SearchForm v-model:area="area" v-model:max-rent="maxRent" v-model:types="types" @search="search" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="searched && results.length === 0" class="muted">
      Nothing here yet. A wider area, or a little more rent, and more doors open.
    </p>
    <p v-else-if="searched && matches.length === 0" class="muted">
      Nothing of those types in this search. Try more types, or a wider area.
    </p>
    <template v-else-if="matches.length > 0">
      <h2>Places you might love</h2>
      <div class="homes">
        <PropertyCard v-for="item in shown" :key="item.listing" v-bind="item" />
      </div>
      <button v-if="!expanded && hiddenCount > 0" type="button" class="secondary" @click="expanded = true">
        View all {{ matches.length }} homes
      </button>
    </template>
  </div>
</template>

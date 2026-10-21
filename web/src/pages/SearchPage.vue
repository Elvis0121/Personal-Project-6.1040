<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { api, explain, type Output } from "../api.ts";
import ListingTerms from "../components/ListingTerms.vue";

type Results = Output<"/listings/search">["results"]["listings"];

const area = ref("");
const maxRent = ref<number | "">("");
const results = ref<Results>([]);
const error = ref("");
const searched = ref(false);
const lastQuery = ref<{ area: string; maxRent: number } | null>(null);

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
  <h1>Find a place</h1>
  <form class="row card" @submit.prevent="search">
    <input v-model="area" placeholder="Area, e.g. Avondale" />
    <input v-model.number="maxRent" type="number" min="0" placeholder="Max rent (US$)" />
    <button>Search</button>
  </form>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-else-if="searched && results.length === 0" class="muted">
    No open places match. Try a wider area or a higher rent.
  </p>
  <article v-for="item in results" :key="item.listing" class="card">
    <div class="row">
      <h3>{{ item.kind }} in {{ item.location }}</h3>
      <span v-if="item.verified" class="status VERIFIED">VERIFIED</span>
      <span v-else class="status unverified">Not yet verified</span>
    </div>
    <ListingTerms v-bind="item" />
    <a :href="`#/listing/${item.listing}`">See this place</a>
  </article>
</template>

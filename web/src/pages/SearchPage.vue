<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, explain, type Output } from "../api.ts";
import ListingTerms from "../components/ListingTerms.vue";

type Results = Output<"/listings/search">["results"]["listings"];

const area = ref("");
const maxRent = ref<number | "">("");
const results = ref<Results>([]);
const error = ref("");
const searched = ref(false);

async function search() {
  error.value = "";
  const result = await api.listings.search({
    area: area.value,
    maxRent: maxRent.value === "" ? Number.MAX_SAFE_INTEGER : Number(maxRent.value),
  });
  searched.value = true;
  if ("error" in result) {
    error.value = explain(result.error, { INVALID_REQUEST: "Enter a maximum rent of zero or more." });
    return;
  }
  results.value = result.results.listings;
}

onMounted(search);
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
    <h3>{{ item.kind }} in {{ item.location }}</h3>
    <ListingTerms v-bind="item" />
    <a :href="`#/listing/${item.listing}`">See this place</a>
  </article>
</template>

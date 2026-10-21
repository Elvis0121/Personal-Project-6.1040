<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { api, explain, type Output } from "../api.ts";
import ListingTerms from "../components/ListingTerms.vue";
import { reviewer } from "../session.ts";

type Queue = Output<"/review/queue">["queue"]["items"];

const items = ref<Queue>([]);
const error = ref("");
const busy = ref("");

async function load() {
  if (!reviewer.value) {
    items.value = [];
    return;
  }
  const result = await api.review.queue({});
  if ("error" in result) {
    error.value = explain(result.error, { FORBIDDEN: "Only the appointed reviewer can open this queue." });
    items.value = [];
    return;
  }
  error.value = "";
  items.value = result.queue.items;
}

async function decide(action: "verify" | "reject", verification: string) {
  busy.value = verification;
  const result = await api.review[action]({ verification });
  busy.value = "";
  if ("error" in result) {
    error.value = explain(result.error, {
      FORBIDDEN: "Only the appointed reviewer can decide this.",
      CONFLICT: "This proof has already been decided.",
      NOT_FOUND: "That proof is no longer pending.",
    });
  }
  await load();
}

watch(reviewer, load, { immediate: true });
const poll = setInterval(() => {
  if (reviewer.value) load();
}, 4000);
onUnmounted(() => clearInterval(poll));
</script>

<template>
  <h1>Pending proof</h1>
  <p class="muted">
    Read the evidence, then verify or reject. Tenants will see the outcome on the listing, never this text.
  </p>
  <p v-if="!reviewer" class="muted">Only the appointed reviewer can open this queue.</p>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-else-if="reviewer && items.length === 0" class="muted">No proof is waiting.</p>
  <article v-for="item in items" :key="item.verification" class="card">
    <div class="row">
      <h3>{{ item.kind ?? "Listing" }} in {{ item.location ?? "unknown location" }}</h3>
      <span class="status PENDING">PENDING</span>
    </div>
    <p class="muted">Advertised by {{ item.advertiser }}</p>
    <ListingTerms
      v-if="item.currency && item.rent != null && item.deposit != null && item.moveIn"
      :currency="item.currency"
      :rent="item.rent"
      :deposit="item.deposit"
      :extras="item.extras ?? ''"
      :move-in="item.moveIn"
    />
    <h4>Evidence</h4>
    <pre class="evidence">{{ item.evidence }}</pre>
    <div class="row">
      <button :disabled="busy === item.verification" @click="decide('verify', item.verification)">
        Verify
      </button>
      <button class="secondary" :disabled="busy === item.verification" @click="decide('reject', item.verification)">
        Reject
      </button>
    </div>
  </article>
</template>

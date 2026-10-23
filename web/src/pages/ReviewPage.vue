<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { api, explain, type Output } from "../api.ts";
import ListingTerms from "../components/ListingTerms.vue";
import PageBand from "../components/PageBand.vue";
import { parseEvidence } from "../proof.ts";
import { reviewer } from "../session.ts";

type Queue = Output<"/review/queue">["queue"]["items"];
type Item = Queue[number] & { proof: ReturnType<typeof parseEvidence> };

const items = ref<Item[]>([]);
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
  items.value = result.queue.items.map((item) => ({ ...item, proof: parseEvidence(item.evidence ?? "") }));
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
  <div class="review-page">
    <PageBand
      src="/stand-ins/flat.jpg"
      eyebrow="For you"
      title="Pending proof"
      lede="You are the one who looks. Tenants never see the file. Thank you for keeping both sides honest."
    />
  <p v-if="!reviewer" class="muted">
    Only the reviewer account can open this. Locally that's <code>kumba</code>. You don't need this page to look for a home or to list one.
  </p>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-else-if="reviewer && items.length === 0" class="muted">No proof is waiting.</p>
  <article v-for="item in items" :key="item.verification" class="card">
    <div class="card-head">
      <h3>{{ item.kind ?? "Listing" }} in {{ item.location ?? "unknown location" }}</h3>
      <div class="marks">
        <span class="status PENDING">PENDING</span>
      </div>
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
    <p v-if="item.proof.kind"><strong>{{ item.proof.kind }}</strong></p>
    <pre v-if="item.proof.note" class="evidence">{{ item.proof.note }}</pre>
    <p v-if="item.proof.filename">
      <a :href="`/api/review/proof/${encodeURIComponent(item.verification)}`">
        Download {{ item.proof.filename }}
      </a>
    </p>
    <div class="row">
      <button :disabled="busy === item.verification" @click="decide('verify', item.verification)">
        Verify
      </button>
      <button class="secondary" :disabled="busy === item.verification" @click="decide('reject', item.verification)">
        Reject
      </button>
    </div>
  </article>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { api, explain, type Output } from "../api.ts";
import ListingTerms from "../components/ListingTerms.vue";
import { account } from "../session.ts";

type Terms = Output<"/listings/view">["terms"];
type Introduction = Output<"/introductions/mine">["mine"];

const props = defineProps<{ listing: string }>();

const terms = ref<Terms | null>(null);
const mine = ref<Introduction | null>(null);
const error = ref("");
const askError = ref("");
const busy = ref(false);

async function load() {
  const result = await api.listings.view({ listing: props.listing });
  if ("error" in result) {
    error.value = explain(result.error, { NOT_FOUND: "This listing does not exist." });
    terms.value = null;
    return;
  }
  error.value = "";
  terms.value = result.terms;
  await loadMine();
}

async function loadMine() {
  if (!account.value || !terms.value || account.value === terms.value.owner) {
    mine.value = null;
    return;
  }
  const result = await api.introductions.mine({ listing: props.listing });
  mine.value = "error" in result ? null : result.mine;
}

async function ask() {
  askError.value = "";
  busy.value = true;
  const result = await api.introductions.request({ listing: props.listing });
  busy.value = false;
  if ("error" in result) {
    askError.value = explain(result.error, {
      CONFLICT: "You have already asked about this place, or it has just been let.",
      FORBIDDEN: "This is your own listing.",
      UNAUTHORIZED: "Please sign in again.",
    });
  }
  await load();
}

// While the advertiser has not answered, check every few seconds so the answer appears by itself.
const poll = setInterval(() => {
  if (mine.value?.status === "PENDING") load();
}, 3000);
onUnmounted(() => clearInterval(poll));

watch([() => props.listing, account], load, { immediate: true });
</script>

<template>
  <a href="#/">Back to search</a>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <article v-if="terms" class="card">
    <div class="row">
      <h1>{{ terms.kind }} in {{ terms.location }}</h1>
      <span class="status" :class="terms.status">{{ terms.status }}</span>
    </div>
    <ListingTerms v-bind="terms" />
    <p class="muted">Advertised by {{ terms.owner }}. Kumba never charges tenants.</p>

    <section v-if="mine?.status === 'ACCEPTED'">
      <p class="notice">{{ terms.owner }} accepted your request. Call them on</p>
      <p class="contact">{{ mine.contact }}</p>
      <p class="muted">Agree the details directly. Kumba never asks you to pay to view or to reserve.</p>
    </section>
    <p v-else-if="mine?.status === 'PENDING'" class="muted">
      Request sent. Waiting for {{ terms.owner }} to answer; this page updates by itself.
    </p>
    <p v-else-if="mine?.status === 'DECLINED'" class="muted">{{ terms.owner }} declined this request.</p>
    <p v-else-if="terms.status !== 'OPEN'" class="muted">This place is no longer available.</p>
    <p v-else-if="!account" class="muted">Sign in to ask the advertiser for an introduction.</p>
    <p v-else-if="account === terms.owner" class="muted">
      This is your listing. Manage it in <a href="#/mine">My listings</a>.
    </p>
    <div v-else>
      <button :disabled="busy" @click="ask">Ask for an introduction</button>
      <p class="muted">
        {{ terms.owner }} will see your username. If they accept, their number appears here.
      </p>
    </div>
    <p v-if="askError" class="error" role="alert">{{ askError }}</p>
  </article>
</template>

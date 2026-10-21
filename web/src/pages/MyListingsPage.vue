<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from "vue";
import { api, explain, type Output } from "../api.ts";
import ListingTerms from "../components/ListingTerms.vue";
import { account } from "../session.ts";

type Mine = Output<"/listings/mine">["mine"]["listings"];

const blank = () => ({
  location: "",
  kind: "Room",
  currency: "USD",
  rent: 0,
  deposit: 0,
  extras: "",
  moveIn: "",
  contact: "",
});

const draft = reactive(blank());
const listings = ref<Mine>([]);
const proofDraft = reactive<Record<string, string>>({});
const publishError = ref("");
const notice = ref("");
const listError = ref("");
const busy = ref(false);

const changeMessages = {
  FORBIDDEN: "Only the advertiser can change this listing.",
  CONFLICT: "This listing has already changed. The list below is now up to date.",
  NOT_FOUND: "That listing no longer exists.",
  UNAUTHORIZED: "Please sign in again.",
};

async function load() {
  if (!account.value) {
    listings.value = [];
    return;
  }
  const result = await api.listings.mine({});
  if ("error" in result) {
    listError.value = explain(result.error, { UNAUTHORIZED: "Please sign in again." });
    return;
  }
  listError.value = "";
  listings.value = result.mine.listings;
}

async function publish() {
  publishError.value = "";
  notice.value = "";
  busy.value = true;
  const result = await api.listings.publish({ ...draft, rent: Number(draft.rent), deposit: Number(draft.deposit) });
  busy.value = false;
  if ("error" in result) {
    publishError.value = explain(result.error, {
      INVALID_REQUEST:
        "Fill in the location, kind of place, currency, move-in date, and contact number. Rent and deposit must be zero or more.",
      UNAUTHORIZED: "Please sign in again before publishing.",
    });
    return;
  }
  Object.assign(draft, blank());
  notice.value = "Published. Tenants can now find it in search.";
  await load();
}

async function submitProof(listing: string) {
  listError.value = "";
  const result = await api.listings["submit-proof"]({
    listing,
    evidence: (proofDraft[listing] ?? "").trim(),
  });
  if ("error" in result) {
    listError.value = explain(result.error, {
      INVALID_REQUEST: "Proof cannot be empty.",
      CONFLICT: "This listing already has proof waiting or verified, or it is not open.",
      FORBIDDEN: "Only the advertiser can submit proof for this listing.",
      NOT_FOUND: "That listing no longer exists.",
      UNAUTHORIZED: "Please sign in again.",
    });
    return;
  }
  proofDraft[listing] = "";
  await load();
}

async function change(action: "mark-let" | "relist", listing: string) {
  listError.value = "";
  const result = await api.listings[action]({ listing });
  if ("error" in result) listError.value = explain(result.error, changeMessages);
  await load();
}

async function answer(action: "accept" | "decline", introduction: string) {
  listError.value = "";
  const result = await api.introductions[action]({ introduction });
  if ("error" in result) {
    listError.value = explain(result.error, {
      FORBIDDEN: "Only the person who was asked can answer this request.",
      CONFLICT: "This request has already been answered.",
      NOT_FOUND: "That request no longer exists.",
      INVALID_REQUEST: "This listing has no contact number to share.",
      UNAUTHORIZED: "Please sign in again.",
    });
  }
  await load();
}

// New requests arrive while the page is open, so check for them every few seconds.
const poll = setInterval(() => {
  if (account.value) load();
}, 4000);
onUnmounted(() => clearInterval(poll));

watch(account, load, { immediate: true });
</script>

<template>
  <p v-if="!account" class="muted">Sign in to advertise a place and see your listings.</p>
  <template v-else>
    <section class="card">
      <h2>Advertise a place</h2>
      <p class="muted">
        Show the full cost up front. Your number stays private until you accept a tenant's request.
      </p>
      <form class="form-grid" @submit.prevent="publish">
        <label>Location<input v-model="draft.location" placeholder="Avondale, Harare" required /></label>
        <label>
          Kind of place
          <select v-model="draft.kind">
            <option>Room</option>
            <option>Cottage</option>
            <option>Flat</option>
            <option>House</option>
          </select>
        </label>
        <label>
          Currency
          <select v-model="draft.currency">
            <option value="USD">US dollars</option>
            <option value="ZWG">ZiG</option>
          </select>
        </label>
        <label>Rent a month<input v-model.number="draft.rent" type="number" min="0" required /></label>
        <label>Deposit<input v-model.number="draft.deposit" type="number" min="0" required /></label>
        <label>Move-in date<input v-model="draft.moveIn" type="date" required /></label>
        <label>Contact number<input v-model="draft.contact" placeholder="0772 000 000" required /></label>
        <label style="grid-column: 1 / -1">
          Extra charges and conditions
          <textarea v-model="draft.extras" rows="2" placeholder="Water billed separately. No viewing fee." />
        </label>
        <div class="row">
          <button :disabled="busy">Publish</button>
          <span v-if="notice" class="notice">{{ notice }}</span>
        </div>
      </form>
      <p v-if="publishError" class="error" role="alert">{{ publishError }}</p>
    </section>

    <h2>Your listings</h2>
    <p v-if="listError" class="error" role="alert">{{ listError }}</p>
    <p v-if="listings.length === 0" class="muted">You have not published anything yet.</p>
    <article v-for="item in listings" :key="item.listing" class="card">
      <div class="row">
        <h3>{{ item.kind }} in {{ item.location }}</h3>
        <span class="status" :class="item.status">{{ item.status }}</span>
        <span v-if="item.proof === 'VERIFIED'" class="status VERIFIED">VERIFIED</span>
        <span v-else-if="item.proof === 'PENDING'" class="status PENDING">Proof pending</span>
      </div>
      <ListingTerms v-bind="item" />
      <p class="muted">Contact given to accepted tenants: {{ item.contact }}</p>
      <p v-if="item.proof === 'VERIFIED'" class="notice">VERIFIED — Kumba has checked this advertiser.</p>
      <p v-else-if="item.proof === 'PENDING'" class="muted">
        Proof submitted. Waiting for Kumba to check it; this page updates by itself.
      </p>
      <form v-else-if="item.status === 'OPEN'" class="form-grid" @submit.prevent="submitProof(item.listing)">
        <label style="grid-column: 1 / -1">
          Proof that you can let this place
          <textarea
            :value="proofDraft[item.listing] ?? ''"
            rows="2"
            placeholder="Rates bill reference, City of Harare, Sept 2026"
            required
            @input="proofDraft[item.listing] = ($event.target as HTMLTextAreaElement).value"
          />
        </label>
        <div class="row">
          <button>Submit proof</button>
        </div>
      </form>

      <h4>Introduction requests</h4>
      <p v-if="item.requests.length === 0" class="muted">No requests yet.</p>
      <ul v-else class="requests">
        <li v-for="request in item.requests" :key="request.introduction" class="row">
          <strong>{{ request.requester }}</strong>
          <span class="status" :class="request.status">{{ request.status }}</span>
          <template v-if="request.status === 'PENDING'">
            <button @click="answer('accept', request.introduction)">Accept and share my number</button>
            <button class="secondary" @click="answer('decline', request.introduction)">Decline</button>
          </template>
        </li>
      </ul>

      <div class="row">
        <button v-if="item.status === 'OPEN'" @click="change('mark-let', item.listing)">Mark as let</button>
        <button v-else class="secondary" @click="change('relist', item.listing)">Relist</button>
      </div>
    </article>
  </template>
</template>

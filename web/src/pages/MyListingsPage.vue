<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from "vue";
import { api, explain, type Output } from "../api.ts";
import ListingTerms from "../components/ListingTerms.vue";
import { stamp } from "../format.ts";
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
const editing = ref<string | null>(null);
const editDraft = reactive(blank());
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

async function confirmAvailable(listing: string) {
  listError.value = "";
  notice.value = "";
  const result = await api.listings.confirm({ listing });
  if ("error" in result) {
    listError.value = explain(result.error, {
      CONFLICT: "This listing is no longer current, or it is not open. Confirm again before the time runs out.",
      FORBIDDEN: "Only the advertiser can confirm this listing.",
      NOT_FOUND: "That listing no longer exists.",
      UNAUTHORIZED: "Please sign in again.",
    });
    await load();
    return;
  }
  notice.value = `Confirmed. Next check by ${stamp(result.deadline)}.`;
  await load();
}

function startEdit(item: Mine[number]) {
  editing.value = item.listing;
  Object.assign(editDraft, {
    location: item.location,
    kind: item.kind,
    currency: item.currency,
    rent: item.rent,
    deposit: item.deposit,
    extras: item.extras,
    moveIn: item.moveIn,
    contact: item.contact,
  });
}

async function saveEdit() {
  if (!editing.value) return;
  listError.value = "";
  notice.value = "";
  const result = await api.listings.update({
    listing: editing.value,
    ...editDraft,
    rent: Number(editDraft.rent),
    deposit: Number(editDraft.deposit),
  });
  if ("error" in result) {
    listError.value = explain(result.error, {
      INVALID_REQUEST:
        "Fill in the location, kind of place, currency, move-in date, and contact number. Rent and deposit must be zero or more.",
      ...changeMessages,
    });
    return;
  }
  editing.value = null;
  notice.value = "Saved.";
  await load();
}

async function change(action: "mark-let" | "relist" | "withdraw", listing: string) {
  listError.value = "";
  notice.value = "";
  const result = await api.listings[action]({ listing });
  if ("error" in result) listError.value = explain(result.error, changeMessages);
  if (action === "withdraw") editing.value = null;
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
    <p v-if="notice" class="notice">{{ notice }}</p>
    <p v-if="listError" class="error" role="alert">{{ listError }}</p>
    <p v-if="listings.length === 0" class="muted">You have not published anything yet.</p>
    <article v-for="item in listings" :key="item.listing" class="card">
      <div class="row">
        <h3>{{ item.kind }} in {{ item.location }}</h3>
        <span class="status" :class="item.status">{{ item.status }}</span>
        <span v-if="item.proof === 'VERIFIED'" class="status VERIFIED">VERIFIED</span>
        <span v-else-if="item.proof === 'PENDING'" class="status PENDING">Proof pending</span>
      </div>
      <form v-if="editing === item.listing" class="form-grid" @submit.prevent="saveEdit">
        <label>Location<input v-model="editDraft.location" required /></label>
        <label>
          Kind of place
          <select v-model="editDraft.kind">
            <option>Room</option>
            <option>Cottage</option>
            <option>Flat</option>
            <option>House</option>
          </select>
        </label>
        <label>
          Currency
          <select v-model="editDraft.currency">
            <option value="USD">US dollars</option>
            <option value="ZWG">ZiG</option>
          </select>
        </label>
        <label>Rent a month<input v-model.number="editDraft.rent" type="number" min="0" required /></label>
        <label>Deposit<input v-model.number="editDraft.deposit" type="number" min="0" required /></label>
        <label>Move-in date<input v-model="editDraft.moveIn" type="date" required /></label>
        <label>Contact number<input v-model="editDraft.contact" required /></label>
        <label style="grid-column: 1 / -1">
          Extra charges and conditions
          <textarea v-model="editDraft.extras" rows="2" />
        </label>
        <div class="row">
          <button type="submit">Save changes</button>
          <button type="button" class="secondary" @click="editing = null">Cancel</button>
        </div>
      </form>
      <template v-else>
        <ListingTerms v-bind="item" />
        <p class="muted">Contact given to accepted tenants: {{ item.contact }}</p>
      </template>
      <p v-if="item.status === 'OPEN' && item.current && item.deadline" class="muted">
        Confirm by {{ stamp(item.deadline) }} that this place is still available.
      </p>
      <p v-else-if="item.status === 'OPEN' && !item.current" class="muted">
        This listing lapsed. It will be withdrawn shortly; then you can relist it.
      </p>
      <div class="row">
        <button
          v-if="item.status === 'OPEN' && item.current"
          type="button"
          @click="confirmAvailable(item.listing)"
        >
          Confirm still available
        </button>
        <button
          v-if="item.status === 'OPEN' && editing !== item.listing"
          type="button"
          class="secondary"
          @click="startEdit(item)"
        >
          Edit
        </button>
        <button v-if="item.status === 'OPEN'" type="button" @click="change('mark-let', item.listing)">
          Mark as let
        </button>
        <button
          v-if="item.status === 'OPEN'"
          type="button"
          class="secondary"
          @click="change('withdraw', item.listing)"
        >
          Withdraw
        </button>
        <button v-if="item.status !== 'OPEN'" type="button" class="secondary" @click="change('relist', item.listing)">
          Relist
        </button>
      </div>

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
          <button type="submit">Submit proof</button>
        </div>
      </form>

      <h4>Introduction requests</h4>
      <p v-if="item.requests.length === 0" class="muted">No requests yet.</p>
      <ul v-else class="requests">
        <li v-for="request in item.requests" :key="request.introduction" class="row">
          <strong>{{ request.requester }}</strong>
          <span class="status" :class="request.status">{{ request.status }}</span>
          <template v-if="request.status === 'PENDING'">
            <button type="button" @click="answer('accept', request.introduction)">Accept and share my number</button>
            <button type="button" class="secondary" @click="answer('decline', request.introduction)">Decline</button>
          </template>
        </li>
      </ul>
    </article>
  </template>
</template>

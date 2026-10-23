<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from "vue";
import { api, explain, type Output } from "../api.ts";
import ListingTerms from "../components/ListingTerms.vue";
import PageBand from "../components/PageBand.vue";
import { stamp } from "../format.ts";
import type { GalleryShot } from "../gallery.ts";
import { rememberNext } from "../auth-next.ts";
import { standInFor } from "../place.ts";
import { formatEvidence, PROOF_KINDS } from "../proof.ts";
import { account } from "../session.ts";

type Mine = (Output<"/listings/mine">["mine"]["listings"][number] & {
  photos?: GalleryShot[];
  displayPhoto?: string | null;
})[];

const MAX_PHOTOS = 8;

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

function goSignIn() {
  rememberNext("#/mine");
  location.hash = "#/sign-in";
}

async function publish() {
  if (!account.value) {
    goSignIn();
    return;
  }
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

async function submitProof(listing: string, event: Event) {
  listError.value = "";
  const form = event.target as HTMLFormElement;
  const data = new FormData(form);
  const kind = String(data.get("kind") ?? "");
  const note = String(data.get("note") ?? "").trim();
  const file = data.get("file");
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (!upload && !note) {
    listError.value = "Attach a document, or write a short note.";
    return;
  }
  const proofErrors = {
    INVALID_REQUEST: "Choose a document type, and attach a file or a short note.",
    CONFLICT: "This listing already has proof waiting or verified, or it is not open.",
    FORBIDDEN: "Only the advertiser can submit proof for this listing.",
    NOT_FOUND: "That listing no longer exists.",
    UNAUTHORIZED: "Please sign in again.",
  };
  if (upload) {
    const body = new FormData();
    body.set("listing", listing);
    body.set("kind", kind);
    body.set("note", note);
    body.set("file", upload);
    const response = await fetch("/api/listings/submit-proof", { method: "POST", body });
    const payload = (await response.json()) as { error?: string };
    if (payload.error) {
      listError.value = explain(payload.error, proofErrors);
      return;
    }
  } else {
    const result = await api.listings["submit-proof"]({
      listing,
      evidence: formatEvidence({ kind, note }),
    });
    if ("error" in result) {
      listError.value = explain(result.error, proofErrors);
      return;
    }
  }
  form.reset();
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

const photoErrors = {
  INVALID_REQUEST: "Use a JPEG, PNG, or WebP under 8MB.",
  CONFLICT: "This listing already has eight photos, or it is not open.",
  FORBIDDEN: "Only the advertiser can change these photos.",
  NOT_FOUND: "That photo is no longer there.",
  UNAUTHORIZED: "Please sign in again.",
};

async function uploadPhoto(listing: string, event: Event) {
  listError.value = "";
  notice.value = "";
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const body = new FormData();
  body.set("listing", listing);
  body.set("file", file);
  const response = await fetch("/api/listings/photos", { method: "POST", body });
  const payload = (await response.json()) as { error?: string };
  input.value = "";
  if (payload.error) {
    listError.value = explain(payload.error, photoErrors);
    return;
  }
  notice.value = "Photo added.";
  await load();
}

async function setDisplay(listing: string, photo: string) {
  listError.value = "";
  notice.value = "";
  const response = await fetch("/api/listings/photos/display", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listing, photo }),
  });
  const payload = (await response.json()) as { error?: string };
  if (payload.error) {
    listError.value = explain(payload.error, photoErrors);
    return;
  }
  notice.value = "Display photo updated.";
  await load();
}

async function removePhoto(listing: string, photo: string) {
  listError.value = "";
  notice.value = "";
  const response = await fetch("/api/listings/photos/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listing, photo }),
  });
  const payload = (await response.json()) as { error?: string };
  if (payload.error) {
    listError.value = explain(payload.error, photoErrors);
    return;
  }
  notice.value = "Photo removed.";
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

function thumbSrc(item: Mine[number]) {
  return item.displayPhoto || standInFor(item.kind).src;
}

function waitingOn(item: Mine[number]) {
  return item.requests.filter((request) => request.status === "PENDING").length;
}

function nextStep(item: Mine[number]) {
  if (item.status !== "OPEN") {
    return "Relist when the place is free. Pending and declined requests are cleared. People who already have your number keep it.";
  }
  if (!item.current) {
    return "This listing lapsed. After it is withdrawn, relist it.";
  }
  const waiting = waitingOn(item);
  if (waiting === 1) return "One person is waiting for your number.";
  if (waiting > 1) return `${waiting} people are waiting for your number.`;
  if (item.deadline) return `Confirm by ${stamp(item.deadline)} that this place is still empty.`;
  if (item.proof === "PENDING") return "Proof is with Kumba. This page updates by itself.";
  if (item.proof !== "VERIFIED") return "Submit proof if you want the VERIFIED label. Tenants never see the file.";
  if (!(item.photos?.length)) return "Add a photo so people see the rooms first.";
  return "";
}
</script>

<template>
  <div class="mine-page">
    <PageBand
      src="/stand-ins/house.jpg"
      eyebrow="Advertise"
      title="My homes"
      :lede="
        account
          ? 'Show the place as you want it seen. Photos, the terms, your own pace. Your number stays private until you say yes.'
          : 'Your place, listed on your terms. Sign in to add a home, or to mark one let. You choose who contacts you.'
      "
    />
    <section class="card">
      <h2>List a place</h2>
      <p class="muted">
        People see the home clearly. They only get your number when you want them to.
      </p>
      <form class="form-grid" @submit.prevent="account ? publish() : goSignIn()">
        <label>Location<input v-model="draft.location" placeholder="Avondale, Harare" required /></label>
        <label>
          Type
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
          <template v-if="account">
            <button :disabled="busy">Publish</button>
            <span v-if="notice" class="notice">{{ notice }}</span>
          </template>
          <template v-else>
            <a class="as-button" href="#/sign-in" @click="rememberNext('#/mine')">Log in</a>
            <a class="as-button secondary" href="#/sign-up" @click="rememberNext('#/mine')">Create an account</a>
          </template>
        </div>
      </form>
      <p v-if="publishError" class="error" role="alert">{{ publishError }}</p>
    </section>

    <template v-if="account">
    <h2>Your listings</h2>
    <p v-if="notice" class="notice">{{ notice }}</p>
    <p v-if="listError" class="error" role="alert">{{ listError }}</p>
    <p v-if="listings.length === 0" class="muted">Your first listing lives here, when you are ready.</p>
    <article v-for="item in listings" :key="item.listing" class="card mine-home">
      <img
        class="mine-thumb"
        :src="thumbSrc(item)"
        :alt="`${item.kind} in ${item.location}`"
      />
      <div class="mine-body">
      <div class="card-head">
        <h3>{{ item.kind }} in {{ item.location }}</h3>
        <div class="marks">
          <span class="status" :class="item.status">{{ item.status }}</span>
          <span v-if="item.proof === 'VERIFIED'" class="status VERIFIED">VERIFIED</span>
          <span v-else-if="item.proof === 'PENDING'" class="status PENDING">Proof pending</span>
        </div>
      </div>
      <p v-if="nextStep(item)" class="mine-next">{{ nextStep(item) }}</p>
      <form v-if="editing === item.listing" class="form-grid" @submit.prevent="saveEdit">
        <label>Location<input v-model="editDraft.location" required /></label>
        <label>
          Type
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

      <section class="mine-section">
        <h4>Availability</h4>
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
          <button v-if="item.status === 'OPEN'" type="button" class="secondary" @click="change('mark-let', item.listing)">
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
      </section>

      <section class="mine-section">
        <h4>Proof</h4>
        <p v-if="item.proof === 'PENDING'" class="muted">
          Waiting for Kumba to check it. This page updates by itself.
        </p>
        <p v-else-if="item.proof === 'VERIFIED'" class="muted">Verified. Tenants never see the file.</p>
        <form
          v-else-if="item.status === 'OPEN'"
          class="form-grid"
          @submit.prevent="submitProof(item.listing, $event)"
        >
          <label>
            Type of document
            <select name="kind" required>
              <option value="" disabled selected>Choose one</option>
              <option v-for="kind in PROOF_KINDS" :key="kind" :value="kind">{{ kind }}</option>
            </select>
          </label>
          <label>
            File
            <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
          </label>
          <label style="grid-column: 1 / -1">
            Note, if you need one
            <textarea name="note" rows="2" placeholder="City of Harare, Sept 2026" />
          </label>
          <p class="muted" style="grid-column: 1 / -1">
            PDF, JPEG, PNG, or WebP. Tenants never see the file, only that Kumba checked it.
          </p>
          <div class="row">
            <button type="submit">Submit proof</button>
          </div>
        </form>
        <p v-else class="muted">Proof can be submitted while the listing is open.</p>
      </section>

      <section class="mine-section">
        <h4>Photos</h4>
        <p class="muted">Show the rooms. Pick one as the display photo people see first.</p>
        <div v-if="(item.photos?.length ?? 0) > 0" class="photo-grid">
          <figure v-for="shot in item.photos" :key="shot.photo" class="photo-tile" :class="{ on: shot.display }">
            <img :src="shot.url" :alt="shot.filename || 'Listing photo'" />
            <div v-if="item.status === 'OPEN'" class="row">
              <button v-if="!shot.display" type="button" class="secondary" @click="setDisplay(item.listing, shot.photo)">
                Use as display photo
              </button>
              <span v-else class="status display-shot">Display photo</span>
              <button type="button" class="secondary" @click="removePhoto(item.listing, shot.photo)">Remove</button>
            </div>
            <p v-else-if="shot.display" class="muted">Display photo</p>
          </figure>
        </div>
        <label v-if="item.status === 'OPEN' && (item.photos?.length ?? 0) < MAX_PHOTOS" class="photo-add">
          Add a photo
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadPhoto(item.listing, $event)" />
        </label>
        <p v-else-if="item.status === 'OPEN'" class="muted">Eight photos is the maximum.</p>
      </section>

      <section class="mine-section">
        <h4>Requests</h4>
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
      </section>
      </div>
    </article>
    </template>
    <p v-else class="muted">Your listings appear here once you are in.</p>
  </div>
</template>

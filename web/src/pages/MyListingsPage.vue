<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from "vue";
import { api, explain, type Output } from "../api.ts";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import ListingTerms from "../components/ListingTerms.vue";
import PageBand from "../components/PageBand.vue";
import { onDay, stamp } from "../format.ts";
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
const draftPhotos = ref<File[]>([]);
const listings = ref<Mine>([]);
const editing = ref<string | null>(null);
const editDraft = reactive(blank());
type Prompt =
  | { kind: "let"; listing: string }
  | { kind: "withdraw"; listing: string }
  | { kind: "relist"; listing: string }
  | { kind: "remove-photo"; listing: string; photo: string }
  | { kind: "accept"; introduction: string; requester: string }
  | { kind: "decline"; introduction: string; requester: string };
const prompt = ref<Prompt | null>(null);
const publishError = ref("");
const toast = ref<{ text: string; tone: "ok" | "error" } | null>(null);
const busy = ref(false);

const photoErrors = {
  INVALID_REQUEST: "Use a JPEG, PNG, or WebP under 8MB.",
  CONFLICT: "This listing already has eight photos, or it is not open.",
  FORBIDDEN: "Only the advertiser can change these photos.",
  NOT_FOUND: "That photo is no longer there.",
  UNAUTHORIZED: "Please sign in again.",
};

const changeMessages = {
  FORBIDDEN: "Only the advertiser can change this listing.",
  CONFLICT: "This listing has already changed. The list below is now up to date.",
  NOT_FOUND: "That listing no longer exists.",
  UNAUTHORIZED: "Please sign in again.",
};

function say(text: string, tone: "ok" | "error" = "ok") {
  toast.value = { text, tone };
}

function promptCopy(current: Prompt) {
  if (current.kind === "let") {
    return {
      title: "Mark this as let?",
      body: "It leaves search. People who already have your number keep it. New people can't ask.",
      confirmLabel: "Mark it let",
      abortLabel: "Keep listing",
      confirmKind: "brand" as const,
    };
  }
  if (current.kind === "withdraw") {
    return {
      title: "Withdraw this listing?",
      body: "It leaves search. You can relist later.",
      confirmLabel: "Withdraw it",
      abortLabel: "Keep listing",
      confirmKind: "danger" as const,
    };
  }
  if (current.kind === "relist") {
    return {
      title: "Relist this place?",
      body: "It goes back on search. People can find it again.",
      confirmLabel: "Relist it",
      abortLabel: "Keep it off",
      confirmKind: "brand" as const,
    };
  }
  if (current.kind === "remove-photo") {
    return {
      title: "Remove this photo?",
      body: "It comes off this listing. You can upload it again later.",
      confirmLabel: "Remove it",
      abortLabel: "Keep photo",
      confirmKind: "danger" as const,
    };
  }
  if (current.kind === "accept") {
    return {
      title: "Share your number?",
      body: `${current.requester} will get your number.`,
      confirmLabel: "Share number",
      abortLabel: "Not yet",
      confirmKind: "accept" as const,
    };
  }
  return {
    title: "Decline this request?",
    body: `${current.requester} will not get your number.`,
    confirmLabel: "Decline",
    abortLabel: "Keep waiting",
    confirmKind: "danger" as const,
  };
}

async function load() {
  if (!account.value) {
    listings.value = [];
    return;
  }
  const result = await api.listings.mine({});
  if ("error" in result) {
    say(explain(result.error, { UNAUTHORIZED: "Please sign in again." }), "error");
    return;
  }
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
  const listing = result.listing;
  const pendingPhotos = draftPhotos.value;
  draftPhotos.value = [];
  for (const file of pendingPhotos) {
    const body = new FormData();
    body.set("listing", listing);
    body.set("file", file);
    const uploaded = await fetch("/api/listings/photos", { method: "POST", body });
    const payload = (await uploaded.json().catch(() => ({}))) as { error?: string };
    if (payload.error) {
      publishError.value = explain(payload.error, photoErrors);
      break;
    }
  }
  say(
    pendingPhotos.length
      ? "Published, with photos. Tenants can now find it in search."
      : "Published. Tenants can now find it in search.",
  );
  await load();
}

async function submitProof(listing: string, event: Event) {
  const form = event.target as HTMLFormElement;
  const data = new FormData(form);
  const kind = String(data.get("kind") ?? "");
  const note = String(data.get("note") ?? "").trim();
  const file = data.get("file");
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (!upload && !note) {
    say("Attach a document, or write a short note.", "error");
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
      say(explain(payload.error, proofErrors), "error");
      return;
    }
  } else {
    const result = await api.listings["submit-proof"]({
      listing,
      evidence: formatEvidence({ kind, note }),
    });
    if ("error" in result) {
      say(explain(result.error, proofErrors), "error");
      return;
    }
  }
  form.reset();
  await load();
}

async function confirmAvailable(listing: string) {
  const result = await api.listings.confirm({ listing });
  if ("error" in result) {
    say(
      explain(result.error, {
        CONFLICT: "This listing is no longer current, or it is not open. Confirm again before the time runs out.",
        FORBIDDEN: "Only the advertiser can confirm this listing.",
        NOT_FOUND: "That listing no longer exists.",
        UNAUTHORIZED: "Please sign in again.",
      }),
      "error",
    );
    await load();
    return;
  }
  say(`Confirmed. Next check by ${stamp(result.deadline)}.`);
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

function movingVerified(item: Mine[number]) {
  return item.proof === "VERIFIED" && editDraft.location.trim() !== item.location.trim();
}

async function saveEdit() {
  if (!editing.value) return;
  const current = listings.value.find((row) => row.listing === editing.value);
  const dropped = current ? movingVerified(current) : false;
  const result = await api.listings.update({
    listing: editing.value,
    ...editDraft,
    rent: Number(editDraft.rent),
    deposit: Number(editDraft.deposit),
  });
  if ("error" in result) {
    say(
      explain(result.error, {
        INVALID_REQUEST:
          "Fill in the location, kind of place, currency, move-in date, and contact number. Rent and deposit must be zero or more.",
        ...changeMessages,
      }),
      "error",
    );
    return;
  }
  editing.value = null;
  say(
    dropped
      ? "Saved. VERIFIED is off because the place moved. Submit proof again if you want the label."
      : "Saved.",
  );
  await load();
}

async function change(action: "mark-let" | "relist" | "withdraw", listing: string) {
  const result = await api.listings[action]({ listing });
  if ("error" in result) say(explain(result.error, changeMessages), "error");
  else if (action === "mark-let") say("Marked as let. It is off search.");
  else if (action === "withdraw") say("Withdrawn. You can relist later.");
  else say("Relisted. People can find it in search again.");
  if (action === "withdraw") editing.value = null;
  await load();
}

async function runPrompt() {
  const current = prompt.value;
  if (!current) return;
  prompt.value = null;
  if (current.kind === "let") return change("mark-let", current.listing);
  if (current.kind === "withdraw") return change("withdraw", current.listing);
  if (current.kind === "relist") return change("relist", current.listing);
  if (current.kind === "remove-photo") return removePhoto(current.listing, current.photo);
  return answer(current.kind, current.introduction);
}

async function uploadPhoto(listing: string, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const body = new FormData();
  body.set("listing", listing);
  body.set("file", file);
  const response = await fetch("/api/listings/photos", { method: "POST", body });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok && !payload.error) {
    say("Could not upload that photo. Try again.", "error");
    return;
  }
  input.value = "";
  if (payload.error) {
    say(explain(payload.error, photoErrors), "error");
    return;
  }
  say("Photo added.");
  await load();
}

async function setDisplay(listing: string, photo: string) {
  const response = await fetch("/api/listings/photos/display", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listing, photo }),
  });
  const payload = (await response.json()) as { error?: string };
  if (payload.error) {
    say(explain(payload.error, photoErrors), "error");
    return;
  }
  say("Display photo updated.");
  await load();
}

async function removePhoto(listing: string, photo: string) {
  const response = await fetch("/api/listings/photos/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listing, photo }),
  });
  const payload = (await response.json()) as { error?: string };
  if (payload.error) {
    say(explain(payload.error, photoErrors), "error");
    return;
  }
  say("Photo removed.");
  await load();
}

async function answer(action: "accept" | "decline", introduction: string) {
  const result = await api.introductions[action]({ introduction });
  if ("error" in result) {
    say(
      explain(result.error, {
        FORBIDDEN: "Only the person who was asked can answer this request.",
        CONFLICT: "This request has already been answered.",
        NOT_FOUND: "That request no longer exists.",
        INVALID_REQUEST: "This listing has no contact number to share.",
        UNAUTHORIZED: "Please sign in again.",
      }),
      "error",
    );
  } else {
    say(action === "accept" ? "They have your number now." : "Request declined.");
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
  if (item.deadline) return `Confirm by ${stamp(item.deadline)} that this place is still available.`;
  if (item.proof === "PENDING") return "Proof is with Kumba. This page updates by itself.";
  if (item.proof !== "VERIFIED") return "Submit proof if you want the VERIFIED label. Tenants never see the file.";
  if (!(item.photos?.length)) return "Add a photo so people see the rooms first.";
  return "";
}

function focusOf(item: Mine[number]) {
  if (item.status !== "OPEN") return "relist";
  if (!item.current) return "lapse";
  if (waitingOn(item) > 0) return "requests";
  if (item.deadline) return "confirm";
  if (item.proof === "PENDING") return "pending-proof";
  if (item.proof !== "VERIFIED") return "proof";
  if (!(item.photos?.length)) return "photos";
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
        <label class="form-span">
          Extra charges and conditions
          <textarea v-model="draft.extras" rows="2" placeholder="Water billed separately. No viewing fee." />
        </label>
        <div class="form-span photo-pick">
          <label class="photo-add as-button">
            {{ draftPhotos.length ? `${draftPhotos.length} photo${draftPhotos.length === 1 ? "" : "s"} ready` : "Add photos" }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              @change="draftPhotos = Array.from(($event.target as HTMLInputElement).files ?? [])"
            />
          </label>
          <span class="muted">JPEG, PNG, or WebP. Uploads when you publish.</span>
        </div>
        <div class="row">
          <template v-if="account">
            <button :disabled="busy">Publish</button>
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
        <label class="form-span">
          Extra charges and conditions
          <textarea v-model="editDraft.extras" rows="2" />
        </label>
        <p v-if="movingVerified(item)" class="mine-warn">
          Different location, so VERIFIED comes off. A cottage in Avondale is not the same claim as one somewhere else.
          You'll need to submit proof again if you want the label.
        </p>
        <div class="row">
          <button type="submit">{{ movingVerified(item) ? "Save, and drop VERIFIED" : "Save changes" }}</button>
          <button type="button" class="secondary" @click="editing = null">Cancel</button>
        </div>
      </form>
      <template v-else>
        <ListingTerms v-bind="item" />
      </template>

      <details class="mine-fold mine-photos">
        <summary>Photos {{ item.photos?.length ? `(${item.photos.length})` : "" }}</summary>
        <p class="muted">Show the rooms. Pick one as the display photo people see first.</p>
        <div v-if="(item.photos?.length ?? 0) > 0" class="photo-grid">
          <figure v-for="shot in item.photos" :key="shot.photo" class="photo-tile" :class="{ on: shot.display }">
            <img :src="shot.url" :alt="shot.filename || 'Listing photo'" />
            <div v-if="item.status === 'OPEN'" class="row">
              <button v-if="!shot.display" type="button" class="secondary" @click="setDisplay(item.listing, shot.photo)">
                Use as display photo
              </button>
              <span v-else class="status display-shot">Display photo</span>
              <button
                type="button"
                class="secondary"
                @click="prompt = { kind: 'remove-photo', listing: item.listing, photo: shot.photo }"
              >
                Remove
              </button>
            </div>
            <p v-else-if="shot.display" class="muted">Display photo</p>
          </figure>
        </div>
        <label v-if="item.status === 'OPEN' && (item.photos?.length ?? 0) < MAX_PHOTOS" class="photo-add as-button">
          Upload a photo
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadPhoto(item.listing, $event)" />
        </label>
        <p v-else-if="item.status === 'OPEN'" class="muted">Eight photos is the maximum.</p>
      </details>

      <section v-if="focusOf(item) === 'proof'" class="mine-section">
        <h4>Proof</h4>
        <form class="form-grid" @submit.prevent="submitProof(item.listing, $event)">
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
          <label class="form-span">
            Note, if you need one
            <textarea name="note" rows="2" placeholder="City of Harare, Sept 2026" />
          </label>
          <p class="muted form-span">
            PDF, JPEG, PNG, or WebP. Tenants never see the file, only that Kumba checked it.
          </p>
          <div class="row">
            <button type="submit">Submit proof</button>
          </div>
        </form>
      </section>
      <details v-else-if="item.status === 'OPEN' && item.proof !== 'VERIFIED'" class="mine-fold">
        <summary>Proof</summary>
        <p v-if="item.proof === 'PENDING'" class="muted">Waiting for Kumba to check it. This page updates by itself.</p>
        <form v-else class="form-grid" @submit.prevent="submitProof(item.listing, $event)">
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
          <label class="form-span">
            Note, if you need one
            <textarea name="note" rows="2" placeholder="City of Harare, Sept 2026" />
          </label>
          <p class="muted form-span">
            PDF, JPEG, PNG, or WebP. Tenants never see the file, only that Kumba checked it.
          </p>
          <div class="row">
            <button type="submit">Submit proof</button>
          </div>
        </form>
      </details>
      <details v-else-if="item.proof === 'VERIFIED'" class="mine-fold">
        <summary>Proof</summary>
        <p class="muted">
          {{
            item.decidedAt
              ? `This listing was verified on ${onDay(item.decidedAt)}. Tenants never see the file.`
              : "This listing is verified. Tenants never see the file."
          }}
        </p>
      </details>

      <details class="mine-fold mine-requests">
        <summary>
          Requests
          <span v-if="waitingOn(item) > 0">
            ({{ waitingOn(item) === 1 ? "1 waiting" : `${waitingOn(item)} waiting` }})
          </span>
        </summary>
        <p v-if="item.requests.length === 0" class="muted">
          There are no pending requests yet. If someone requests to see your property, they will appear here.
        </p>
        <ul v-else class="requests">
          <li v-for="request in item.requests" :key="request.introduction" class="request-row">
            <strong class="request-name">{{ request.requester }}</strong>
            <span v-if="request.status !== 'PENDING'" class="status" :class="request.status">{{ request.status }}</span>
            <template v-else>
              <button
                type="button"
                class="status-action accept"
                @click="prompt = { kind: 'accept', introduction: request.introduction, requester: request.requester }"
              >
                ACCEPT
              </button>
              <button
                type="button"
                class="status-action decline"
                @click="prompt = { kind: 'decline', introduction: request.introduction, requester: request.requester }"
              >
                DECLINE
              </button>
            </template>
          </li>
        </ul>
      </details>

      <p v-if="editing !== item.listing" class="muted">Contact given to accepted tenants: {{ item.contact }}</p>

      <section class="mine-section">
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
          <button
            v-if="item.status === 'OPEN'"
            type="button"
            class="secondary"
            @click="prompt = { kind: 'let', listing: item.listing }"
          >
            Mark as let
          </button>
          <button
            v-if="item.status === 'OPEN'"
            type="button"
            class="secondary"
            @click="prompt = { kind: 'withdraw', listing: item.listing }"
          >
            Withdraw
          </button>
          <button
            v-if="item.status !== 'OPEN'"
            type="button"
            @click="prompt = { kind: 'relist', listing: item.listing }"
          >
            Relist
          </button>
        </div>
      </section>
      </div>
    </article>
    </template>
    <p v-else class="muted">Your listings appear here once you are in.</p>
    <ConfirmDialog
      v-if="prompt"
      v-bind="promptCopy(prompt)"
      @confirm="runPrompt"
      @abort="prompt = null"
    />
    <ConfirmDialog
      v-else-if="toast"
      :title="toast.tone === 'error' ? 'Could not do that' : 'Done'"
      :body="toast.text"
      confirm-label="OK"
      :confirm-kind="toast.tone === 'error' ? 'danger' : 'brand'"
      @confirm="toast = null"
      @abort="toast = null"
    />
  </div>
</template>

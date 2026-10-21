<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { api, explain, type Output } from "../api.ts";
import AmenityTag from "../components/AmenityTag.vue";
import HomePhoto from "../components/HomePhoto.vue";
import ListingTerms from "../components/ListingTerms.vue";
import { rememberNext } from "../auth-next.ts";
import type { GalleryShot } from "../gallery.ts";
import { headlineFor, standInFor } from "../place.ts";
import { account } from "../session.ts";

type Terms = NonNullable<Output<"/listings/view">["terms"]> & {
  displayPhoto?: string | null;
  photos?: GalleryShot[];
};
type Introduction = Output<"/introductions/mine">["mine"];

const props = defineProps<{ listing: string }>();

const terms = ref<Terms | null>(null);
const mine = ref<Introduction | null>(null);
const error = ref("");
const askError = ref("");
const busy = ref(false);
const active = ref(0);

const shots = computed<GalleryShot[]>(() => {
  const gallery = terms.value?.photos?.filter((shot) => shot.url) ?? [];
  if (gallery.length > 0) return gallery;
  const kind = terms.value?.kind ?? "House";
  const stand = standInFor(kind);
  return [{ photo: "", url: stand.src, display: true }];
});

const activeUrl = computed(() => shots.value[active.value]?.url ?? shots.value[0]?.url ?? null);
const advertiserPhotos = computed(() => (terms.value?.photos?.length ?? 0) > 0);

async function load() {
  const result = await api.listings.view({ listing: props.listing });
  if ("error" in result) {
    error.value = explain(result.error, { NOT_FOUND: "This listing does not exist." });
    terms.value = null;
    return;
  }
  error.value = "";
  terms.value = result.terms as Terms;
  const gallery = terms.value.photos ?? [];
  const shown = gallery.findIndex((shot) => shot.display);
  active.value = shown >= 0 ? shown : 0;
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

const poll = setInterval(load, 3000);
onUnmounted(() => clearInterval(poll));

watch([() => props.listing, account], load, { immediate: true });
</script>

<template>
  <div class="listing-page">
    <a href="#/homes">Back to homes</a>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="terms" class="listing-layout">
      <div class="listing-media">
        <HomePhoto
          class="listing-main-photo"
          :listing="listing"
          :kind="terms.kind"
          :location="terms.location"
          :verified="terms.verified"
          :display-photo="activeUrl"
        />
        <p class="muted photo-credit">
          {{ advertiserPhotos ? "Photos from the landlord." : "A stand-in photo. Not a picture of this listing." }}
        </p>
        <div v-if="shots.length > 1" class="listing-thumbs">
          <button
            v-for="(shot, index) in shots"
            :key="shot.photo || shot.url"
            type="button"
            class="listing-thumb"
            :class="{ on: index === active }"
            @click="active = index"
          >
            <img :src="shot.url" alt="" />
          </button>
        </div>
      </div>
      <article class="card listing-panel">
        <div class="card-head">
          <h1>{{ headlineFor(terms.kind, listing) }}</h1>
        </div>
        <p class="place-where">{{ terms.location }}</p>
        <div class="marks">
          <AmenityTag :label="terms.kind" />
        </div>
        <ListingTerms
          :currency="terms.currency"
          :rent="terms.rent"
          :deposit="terms.deposit"
          :extras="terms.extras"
          :move-in="terms.moveIn"
        />
        <p class="muted">The costs are yours to read. Kumba never charges you to look.</p>

        <div v-if="!account" class="auth-gate">
          <p>
            You already have the terms. Log in when you are ready to meet the person behind this home.
          </p>
          <div class="hero-actions">
            <a class="as-button" href="#/sign-in" @click="rememberNext(`#/listing/${listing}`)">Log in</a>
            <a class="as-button secondary" href="#/sign-up" @click="rememberNext(`#/listing/${listing}`)">
              Create an account
            </a>
          </div>
        </div>
        <template v-else>
          <p class="advertiser">
            Advertised by {{ terms.owner }}.
            <AmenityTag :label="terms.status" />
          </p>
          <section v-if="mine?.status === 'ACCEPTED'">
            <p class="notice">{{ terms.owner }} accepted your request. Call them on</p>
            <p class="contact">{{ mine.contact }}</p>
            <p class="muted">Agree the details directly. Nobody here will ask you to pay to view, or to reserve.</p>
          </section>
          <p v-else-if="mine?.status === 'PENDING'" class="muted">
            Request sent. Waiting for {{ terms.owner }} to answer; this page updates by itself.
          </p>
          <p v-else-if="mine?.status === 'DECLINED'" class="muted">{{ terms.owner }} declined this request.</p>
          <p v-else-if="terms.status !== 'OPEN' || !terms.current" class="muted">This place is no longer available.</p>
          <p v-else-if="account === terms.owner" class="muted">
            This is your home. Manage it in <a href="#/mine">My homes</a>.
          </p>
          <div v-else>
            <button type="button" :disabled="busy" @click="ask">Ask for an introduction</button>
            <p class="muted">
              {{ terms.owner }} will see your username. If they accept, their number appears here.
            </p>
          </div>
        </template>
        <p v-if="askError" class="error" role="alert">{{ askError }}</p>
      </article>
    </div>
  </div>
</template>

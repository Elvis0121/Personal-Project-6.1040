<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { api } from "../api.ts";
import PageBand from "../components/PageBand.vue";
import PropertyCard from "../components/PropertyCard.vue";
import type { GalleryShot } from "../gallery.ts";
import { savedHomes } from "../saved.ts";

type Card = {
  listing: string;
  location: string;
  kind: string;
  currency: string;
  rent: number;
  deposit: number;
  extras: string;
  moveIn: string;
  verified: boolean;
  displayPhoto?: string | null;
  photos?: GalleryShot[];
};

const cards = ref<Card[]>([]);
const loading = ref(false);

const gone = computed(() => Math.max(0, savedHomes.value.length - cards.value.length));

async function load() {
  loading.value = true;
  const open: Card[] = [];
  for (const home of savedHomes.value) {
    const result = await api.listings.view({ listing: home.listing });
    if ("error" in result || !result.terms) continue;
    const terms = result.terms as Card & { current?: boolean; status?: string };
    if (!terms.listing || !terms.location || !terms.kind || terms.current !== true || terms.status !== "OPEN") {
      continue;
    }
    open.push({
      listing: terms.listing,
      location: terms.location,
      kind: terms.kind,
      currency: terms.currency ?? "USD",
      rent: terms.rent ?? 0,
      deposit: terms.deposit ?? 0,
      extras: terms.extras ?? "",
      moveIn: terms.moveIn ?? "",
      verified: terms.verified === true,
      displayPhoto: terms.displayPhoto ?? null,
    });
  }
  cards.value = open;
  loading.value = false;
}

watch(savedHomes, load, { immediate: true });
</script>

<template>
  <div class="search-page">
    <PageBand
      src="/stand-ins/room.jpg"
      eyebrow="Your shortlist"
      title="Liked places"
      lede="Saved on this device, for when you are ready. Nobody else sees this list."
    />
    <p v-if="!loading && savedHomes.length === 0" class="muted">
      You have not liked a place yet. <a href="#/homes">Find your home</a>.
    </p>
    <template v-else-if="cards.length > 0">
      <div class="homes">
        <PropertyCard v-for="item in cards" :key="item.listing" v-bind="item" />
      </div>
      <p v-if="gone > 0" class="muted">{{ gone }} liked {{ gone === 1 ? "place is" : "places are" }} no longer open.</p>
    </template>
    <p v-else-if="!loading" class="muted">Those places are no longer open. <a href="#/homes">Find your home</a>.</p>
  </div>
</template>

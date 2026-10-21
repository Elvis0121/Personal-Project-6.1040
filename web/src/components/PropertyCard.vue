<script setup lang="ts">
import AmenityTag from "./AmenityTag.vue";
import HomePhoto from "./HomePhoto.vue";
import ListingTerms from "./ListingTerms.vue";
import { headlineFor } from "../place.ts";

defineProps<{
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
}>();
</script>

<template>
  <article class="card property">
    <HomePhoto
      :listing="listing"
      :kind="kind"
      :location="location"
      :verified="verified"
      :display-photo="displayPhoto"
    />
    <div class="property-body">
      <div class="card-head">
        <h3>
          <a :href="`#/listing/${listing}`">{{ headlineFor(kind, listing) }}</a>
        </h3>
      </div>
      <p class="place-where">{{ location }}</p>
      <div class="marks">
        <AmenityTag :label="kind" />
      </div>
      <ListingTerms
        :currency="currency"
        :rent="rent"
        :deposit="deposit"
        :extras="extras"
        :move-in="moveIn"
      />
      <a class="property-link" :href="`#/listing/${listing}`">See this home</a>
    </div>
  </article>
</template>

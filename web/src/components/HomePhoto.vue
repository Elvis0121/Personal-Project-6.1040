<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { standInFor } from "../place.ts";
import AmenityTag from "./AmenityTag.vue";
import SaveButton from "./SaveButton.vue";

const props = defineProps<{
  listing: string;
  kind: string;
  location: string;
  verified: boolean;
  displayPhoto?: string | null;
  hideSave?: boolean;
}>();

const broken = ref(false);
watch(
  () => props.displayPhoto,
  () => {
    broken.value = false;
  },
);

const photo = computed(() => {
  const stand = standInFor(props.kind);
  if (!props.displayPhoto || broken.value) return stand;
  return { src: props.displayPhoto, alt: `${props.kind} in ${props.location}` };
});
</script>

<template>
  <figure class="home-photo">
    <img :src="photo.src" :alt="photo.alt" width="1600" height="1200" @error="broken = true" />
    <AmenityTag
      class="photo-check"
      :label="verified ? 'VERIFIED' : 'NOT VERIFIED'"
      :tone="verified ? 'verified' : 'unverified'"
    />
    <SaveButton v-if="!hideSave" :listing="listing" :kind="kind" :location="location" />
  </figure>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { isSaved, toggleSaved } from "../saved.ts";

const props = defineProps<{ listing: string; kind: string; location: string }>();

const on = computed(() => isSaved(props.listing));
</script>

<template>
  <button
    type="button"
    class="save"
    :class="{ on }"
    :aria-pressed="on"
    :aria-label="on ? 'Unlike this home' : 'Like this home'"
    @click.stop="toggleSaved({ listing, kind, location })"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 20.2 10.6 19C5.4 14.4 2 11.3 2 7.6 2 4.6 4.4 2.4 7.2 2.4c1.6 0 3.2.8 4.2 2 1-1.2 2.6-2 4.2-2C19.6 2.4 22 4.6 22 7.6c0 3.7-3.4 6.8-8.6 11.4L12 20.2z"
      />
    </svg>
  </button>
</template>

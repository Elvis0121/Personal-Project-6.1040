<script setup lang="ts">
defineProps<{
  label: string;
  tone?: "default" | "verified" | "unverified";
}>();
</script>

<template>
  <span class="amenity" :class="{ verified: tone === 'verified', unverified: tone === 'unverified' }">{{
    label
  }}</span>
</template>

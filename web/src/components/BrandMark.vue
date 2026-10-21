<script setup lang="ts">
defineProps<{ label?: string }>();
</script>

<template>
  <svg
    class="brand-mark"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    fill="none"
    role="img"
    :aria-hidden="label ? undefined : true"
    :aria-label="label"
  >
    <rect width="64" height="64" rx="14" fill="#355442" />
    <path
      d="M9 29 L32 10 L55 29"
      stroke="#FFF7ED"
      stroke-width="4.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M16 27 V49 Q16 53 20 53 H44 Q48 53 48 49 V27"
      stroke="#FFF7ED"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <path d="M23 31 Q27 27 31 31 Q35 27 39 31 Q39 36 31 40 Q23 36 23 31Z" fill="#FFF7ED" />
    <path
      d="M27 53 V41 Q27 37 32 37 Q37 37 37 41 V53"
      stroke="#F4D8B8"
      stroke-width="3.5"
      stroke-linecap="round"
    />
  </svg>
</template>

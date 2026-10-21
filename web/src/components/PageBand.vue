<script setup lang="ts">
defineProps<{
  src: string;
  eyebrow?: string;
  title: string;
  lede?: string;
}>();
</script>

<template>
  <section class="page-band">
    <img :src="src" alt="" />
    <div class="page-band-copy">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="lede" class="lede">{{ lede }}</p>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  kicker?: string;
  title: string;
  steps: { title: string; body: string; src: string; alt: string }[];
}>();
</script>

<template>
  <section class="safe-path">
    <p v-if="kicker" class="safe-kicker">{{ kicker }}</p>
    <h2>{{ title }}</h2>
    <div class="safe-steps">
      <article v-for="(step, index) in steps" :key="step.title" class="safe-step">
        <figure>
          <img :src="step.src" :alt="step.alt" width="1200" height="900" />
          <span class="safe-num">{{ index + 1 }}</span>
        </figure>
        <h3>{{ step.title }}</h3>
        <p>{{ step.body }}</p>
      </article>
    </div>
    <div v-if="$slots.cta" class="safe-cta">
      <slot name="cta" />
    </div>
  </section>
</template>

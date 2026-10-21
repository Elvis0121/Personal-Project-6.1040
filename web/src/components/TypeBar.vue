<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const PHRASES = ["Kumba", "Bvisa Musondosi", "Pinda Muden"] as const;

const word = ref<string>(PHRASES[0]);
const shown = ref("");
const reduce = ref(false);
const typeSize = computed(() => {
  const n = Math.max(word.value.length, 4);
  return `clamp(2.4rem, ${(92 / n).toFixed(2)}vw, 11rem)`;
});

let timer: ReturnType<typeof setTimeout> | undefined;
let alive = true;
let i = 0;
let deleting = false;
let cycle = 0;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
}

async function loop() {
  while (alive && !reduce.value) {
    if (!deleting) {
      i += 1;
      shown.value = word.value.slice(0, i);
      if (i === word.value.length) {
        deleting = true;
        await wait(2400);
      } else {
        await wait(280);
      }
    } else {
      i -= 1;
      shown.value = word.value.slice(0, i);
      if (i === 0) {
        deleting = false;
        cycle = (cycle + 1) % PHRASES.length;
        word.value = PHRASES[cycle]!;
        await wait(850);
      } else {
        await wait(150);
      }
    }
  }
}

onMounted(() => {
  reduce.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce.value) {
    shown.value = word.value;
    return;
  }
  loop();
});
onUnmounted(() => {
  alive = false;
  clearTimeout(timer);
});
</script>

<template>
  <div class="type-bar" aria-hidden="true">
    <p :style="{ fontSize: typeSize }">
      <span>{{ shown }}</span>
      <span v-if="!reduce" class="caret"></span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

const props = defineProps<{
  title: string;
  body: string;
  confirmLabel: string;
  abortLabel?: string;
  confirmKind?: "brand" | "accept" | "danger";
}>();

const emit = defineEmits<{ confirm: []; abort: [] }>();

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") emit("abort");
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport to="body">
    <div class="dialog-scrim" @click.self="emit('abort')">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title">{{ title }}</h2>
        <p>{{ body }}</p>
        <div class="row">
          <button
            type="button"
            :class="{
              accept: props.confirmKind === 'accept',
              danger: props.confirmKind === 'danger',
            }"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
          <button v-if="abortLabel" type="button" class="secondary" @click="emit('abort')">
            {{ abortLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

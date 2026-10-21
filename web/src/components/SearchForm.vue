<script setup lang="ts">
import { SPACE_KINDS } from "../place.ts";

const area = defineModel<string>("area", { default: "" });
const maxRent = defineModel<number | "">("maxRent", { default: "" });
const types = defineModel<string[]>("types", { default: () => [] });
defineEmits<{ search: [] }>();
</script>

<template>
  <form class="search" @submit.prevent="$emit('search')">
    <label class="search-field">
      Area
      <input v-model="area" placeholder="Avondale, Harare" />
    </label>
    <label class="search-field">
      Max rent
      <input v-model.number="maxRent" type="number" min="0" placeholder="US$" />
    </label>
    <button type="submit">Find my home</button>
    <fieldset class="type-picks">
      <legend>Type</legend>
      <div class="picks">
        <label v-for="space in SPACE_KINDS" :key="space" class="pick">
          <input v-model="types" type="checkbox" :value="space" />
          {{ space }}
        </label>
      </div>
    </fieldset>
  </form>
</template>

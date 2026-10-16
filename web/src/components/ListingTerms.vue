<script setup lang="ts">
import { day, money } from "../format.ts";

defineProps<{
  currency: string;
  rent: number;
  deposit: number;
  extras: string;
  moveIn: string;
}>();
</script>

<template>
  <dl class="terms">
    <dt>Rent</dt>
    <dd>{{ money(currency, rent) }} a month</dd>
    <dt>Deposit</dt>
    <dd>{{ money(currency, deposit) }}</dd>
    <dt>Extras</dt>
    <dd>{{ extras || "None" }}</dd>
    <dt>Move in</dt>
    <dd>{{ day(moveIn) }}</dd>
  </dl>
</template>

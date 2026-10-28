<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, type Output } from "../api.ts";
import PropertyCard from "../components/PropertyCard.vue";
import SafePath from "../components/SafePath.vue";
import TypeBar from "../components/TypeBar.vue";
import { rememberNext } from "../auth-next.ts";
import type { GalleryShot } from "../gallery.ts";

type Card = Output<"/listings/search">["results"]["listings"][number] & {
  displayPhoto?: string | null;
  photos?: GalleryShot[];
};

const PREVIEW = 6;
const homes = ref<Card[]>([]);
const loaded = ref(false);

onMounted(async () => {
  const result = await api.listings.search({ area: "", maxRent: Number.MAX_SAFE_INTEGER });
  loaded.value = true;
  if ("error" in result) return;
  homes.value = result.results.listings.slice(0, PREVIEW);
});

const tenantSteps = [
  {
    title: "See what it costs, first",
    body: "Rent, deposit, extras, move-in. You can walk away before anyone asks for a viewing fee, or a US$20 agent fee.",
    src: "/homes/bedroom.jpg",
    alt: "A bedroom in a house that is actually to let",
  },
  {
    title: "We look at who is behind the advert",
    body: "A rates bill, a ZESA bill, a title deed. You never see the file. VERIFIED means someone here looked.",
    src: "/homes/lounge-hearth.png",
    alt: "A sitting room with doors out to the garden",
  },
  {
    title: "Only live rooms stay in search",
    body: "If it is let, or the owner does not confirm it is still available, it leaves. You spend time on places you can actually have.",
    src: "/homes/lounge-desk.png",
    alt: "A furnished sitting room with a fireplace and desk",
  },
];

const landlordSteps = [
  {
    title: "You decide who gets the number",
    body: "People ask for an introduction. You accept the ones you want. Until then, your phone stays yours.",
    src: "/homes/townhouses.png",
    alt: "A cluster of brick houses photographed from above",
  },
  {
    title: "Serious interest, not a flood of calls",
    body: "They already know the terms. They have seen the photos. Fewer tyre-kickers at the gate, more people who are ready.",
    src: "/homes/lounge-tv.png",
    alt: "A sitting room with a television, as a tenant would see it",
  },
  {
    title: "When it is let, the chase stops",
    body: "Mark it let, and other people stop knocking. Confirm it is still open when you want it seen. You stay in charge of the listing.",
    src: "/homes/solar.png",
    alt: "A house on a new street, photographed from above",
  },
];


const faqs = [
  {
    q: "Can I look around before signing up?",
    a: "Yes. Search and open a listing with no account. Sign in only to ask for a number, or to list a place.",
  },
  {
    q: "Is Kumba free for people looking for a home?",
    a: "Yes. You do not pay Kumba to search, to see a listing, or to get a number. Rent and deposit go to the landlord, outside the app.",
  },
  {
    q: "How does Kumba help me avoid scams?",
    a: "Full cost is on the card before anyone has your money. VERIFIED means someone here looked at the advertiser's proof; you never see the file. If it is let, or the owner does not confirm it is still available, it leaves search. VERIFIED is that document check, not a guarantee of every detail.",
  },
  {
    q: "What does the VERIFIED badge mean?",
    a: "Someone here looked at a rates bill, ZESA bill, title deed, or similar. Tenants never see the file. Unverified listings still appear, labelled.",
  },
  {
    q: "How do I get in touch with a landlord?",
    a: "Ask for an introduction. If they accept, you get their number. Until then, the number stays off the page.",
  },
  {
    q: "How do I know a place is still available?",
    a: "Owners have to confirm it is still open. Mark it let, or miss the confirm, and it leaves search.",
  },
  {
    q: "How do I list a place?",
    a: "Sign in and publish the terms: rent, deposit, extras, move-in. Add photos if you have them. Submit proof if you want VERIFIED. Confirm it is still available, or mark it let when it is gone.",
  },
  {
    q: "What documents can I submit for verification?",
    a: "A rates bill, water bill, electricity bill, title deed, lease, or a short note. PDF or a photo. Tenants never see it.",
  },
];

</script>

<template>
  <div class="landing">
    <section class="hero-full">
      <TypeBar />
      <div class="hero-copy">
        <p class="eyebrow">A fairer way to find a home</p>
        <h1>Finding a home is hard enough</h1>
        <p class="lede">
          Full cost up front. Who is behind the advert, checked. Stale listings gone. Look around with no account.
        </p>
        <div class="hero-actions">
          <a class="as-button" href="#/homes">Find your home</a>
          <a class="as-button ghost" href="#/mine" @click="rememberNext('#/mine')">List a place</a>
        </div>
      </div>
    </section>

    <div class="landing-body">
      <section class="preview">
        <p class="safe-kicker">Open now</p>
        <h2>Places you can look at today</h2>
        <p v-if="loaded && homes.length === 0" class="muted">
          Nothing listed yet. Check back, or <a href="#/mine" @click="rememberNext('#/mine')">list a place</a>.
        </p>
        <div v-else-if="homes.length > 0" class="homes">
          <PropertyCard v-for="item in homes" :key="item.listing" v-bind="item" />
        </div>
        <p v-if="homes.length > 0" class="preview-more">
          <a class="as-button" href="#/homes">See all homes</a>
        </p>
      </section>

      <SafePath kicker="If you are looking" title="How Kumba keeps tenants safe" :steps="tenantSteps">
        <template #cta>
          <a class="as-button" href="#/homes">Find your home</a>
        </template>
      </SafePath>
      <SafePath kicker="If you are letting" title="How Kumba keeps landlords safe" :steps="landlordSteps">
        <template #cta>
          <a class="as-button" href="#/mine" @click="rememberNext('#/mine')">List a place</a>
        </template>
      </SafePath>

      <section class="faq">
        <h2>FAQs</h2>
        <details v-for="item in faqs" :key="item.q">
          <summary>{{ item.q }}</summary>
          <p>{{ item.a }}</p>
        </details>
      </section>
    </div>

    <footer class="contact-stub">
      <h2>Contact</h2>
      <p>Kumba · Zimbabwe</p>
      <div class="contact-actions">
        <a
          class="as-button"
          href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@kumba.zw&su=Hello%20Kumba"
          target="_blank"
          rel="noopener noreferrer"
        >
          Email hello@kumba.zw
        </a>
        <a
          class="as-button ghost"
          href="https://wa.me/263771234567?text=Hello%20Kumba"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp +263 77 123 4567
        </a>
      </div>
    </footer>
  </div>
</template>

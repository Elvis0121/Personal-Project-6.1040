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
    a: "Of course. Have a look around, compare places, and check the costs before committing to anything. No account needed. When you find somewhere you like, sign in to request an introduction or manage your listings."
  },
  {
    q: "Is Kumba free for people looking for a home?",
    a: "Yes. Searching is free, and we'll never ask you to pay just to view a place, get a contact number, or reserve a room. Rent and deposit are arranged directly with the landlord, outside Kumba."
  },
  {
    q: "How does Kumba help me avoid scams?",
    a: "Finding a home takes enough effort already. We show the full advertised cost upfront, check supporting documents submitted by advertisers, and ask owners to reconfirm that a place is still available. You can also see whether an advertiser has been verified, so you have more information before deciding who to contact. VERIFIED means we've completed our stated document check, not that every detail of a listing is guaranteed."
  },
  {
    q: "What does the VERIFIED badge mean?",
    a: "It's an extra bit of reassurance. We've reviewed supporting documents to check that the advertiser has evidence they can let the property. We keep those documents private, so you won't see someone's personal paperwork. Places without the badge can still appear in search, clearly labelled so you can make your own informed choice."
  },
  {
    q: "How do I get in touch with a landlord?",
    a: "We help landlords keep track of who's interested, so your request doesn't get lost in a sea of calls and messages. Send a request for an introduction, and if the advertiser accepts, we'll share their contact number with you. It's a more organised way to connect, while giving both sides a little more breathing room."
  },
  {
    q: "How do I know a place is still available?",
    a: "We know how disappointing it is to find a place you love, only to discover it's already taken. That's why owners are asked to confirm that their listings are still available. If a place is marked as let or isn't reconfirmed, it leaves search. We're working to help you spend more time finding your next home and less time chasing old adverts."
  },
  {
    q: "I'd like to advertise a place. How do I get started?",
    a: "Welcome! Create an account, add your property's details, and make the rental terms clear so people know what to expect. Keep the listing up to date by confirming availability, and you can submit supporting documents if you'd like your advert to display the VERIFIED badge."
  },
  {
    q: "What documents can I submit for verification?",
    a: "You can submit a rates bill, water bill, electricity bill, title deed, lease, or a short note as supporting evidence. We accept a PDF or a photo. Your documents are kept private and aren't shown to prospective tenants. We'll review the evidence as part of our verification process."
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

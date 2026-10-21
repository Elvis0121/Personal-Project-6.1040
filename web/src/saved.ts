import { ref, watch } from "vue";

const KEY = "kumba-saved";

export type SavedHome = { listing: string; kind: string; location: string };

function read(): SavedHome[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        if (typeof item === "string") return { listing: item, kind: "", location: "" };
        if (item && typeof item === "object" && "listing" in item) {
          const row = item as SavedHome;
          return { listing: String(row.listing), kind: String(row.kind ?? ""), location: String(row.location ?? "") };
        }
        return null;
      })
      .filter((item): item is SavedHome => item !== null);
  } catch {
    return [];
  }
}

/** Listing identities liked on this device. Not a server concept. */
export const savedHomes = ref(read());

watch(savedHomes, (value) => {
  localStorage.setItem(KEY, JSON.stringify(value));
});

export function isSaved(listing: string) {
  return savedHomes.value.some((home) => home.listing === listing);
}

export function toggleSaved(home: SavedHome) {
  savedHomes.value = isSaved(home.listing)
    ? savedHomes.value.filter((item) => item.listing !== home.listing)
    : [...savedHomes.value, home];
}

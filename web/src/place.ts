/** Types the advertiser can publish. Search filters this same list. */
export const SPACE_KINDS = ["Room", "Cottage", "Flat", "House"] as const;

/**
 * Editorial lines, not advertiser copy. Pick is a hash of the listing identity,
 * so the same place keeps the same heading without calling a model.
 * None of these invent a garden, a bedroom count, or a view.
 */
const headlines: Record<string, string[]> = {
  Room: [
    "A room of your own",
    "A quiet place to land",
    "Somewhere to begin",
    "A room for the night and the morning",
  ],
  Cottage: [
    "A cottage, not a compound",
    "A small house with its own door",
    "A cottage to settle into",
    "Close in, and yours",
  ],
  Flat: [
    "A flat of your own",
    "An upstairs life",
    "A simple flat to come back to",
    "A flat, and the city outside",
  ],
  House: [
    "A house of your own",
    "A house the day can fill",
    "A house to come back to",
    "Under one roof",
  ],
};

const fallback = ["A place to come home to", "Somewhere to belong", "A door of your own"];

const photos: Record<string, string> = {
  Room: "/stand-ins/room.jpg",
  Cottage: "/stand-ins/cottage.jpg",
  Flat: "/stand-ins/flat.jpg",
  House: "/stand-ins/house.jpg",
};

function pick(seed: string, options: string[]) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 33 + seed.charCodeAt(i)) >>> 0;
  return options[n % options.length]!;
}

export function headlineFor(kind: string, listing = "") {
  return pick(listing || kind, headlines[kind] ?? fallback);
}

/** Mood photo for that type of place. Not a picture of the listing. */
export function standInFor(kind: string) {
  const space = kind.toLowerCase();
  return {
    src: photos[kind] ?? photos.House,
    alt: `Stand-in photo of a ${space}, not this listing`,
  };
}

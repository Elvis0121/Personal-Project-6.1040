const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function lifetimeFromEnv() {
  const raw = process.env.LISTING_LIFETIME_MS;
  if (raw === undefined || raw === "") return THIRTY_DAYS_MS;
  const ms = Number(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : THIRTY_DAYS_MS;
}

/** How long a listing stays current unless the owner confirms it. Override with LISTING_LIFETIME_MS (30 min locally). */
export const LISTING_LIFETIME_MS = lifetimeFromEnv();

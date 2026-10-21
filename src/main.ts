import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication, expireDue } from "./assembly.ts";
import { AuthenticatingConcept, UsernameTaken } from "./concepts/Authenticating.ts";
import { ExpiringConcept } from "./concepts/Expiring.ts";
import { ListingConcept } from "./concepts/Listing.ts";
import { AlreadyAppointed, VerifyingConcept } from "./concepts/Verifying.ts";
import { LISTING_LIFETIME_MS } from "./listing-lifetime.ts";
import { db } from "./db.ts";
import { policy } from "./http.ts";
import { withPhotoRoutes } from "./photo-http.ts";
import { withProofRoutes } from "./proof-http.ts";

/** Seed lives here, not in assemble: generate and check must not talk to Mongo. */
async function seedReviewer() {
  const reviewer = process.env.REVIEWER ?? "kumba";
  const password = process.env.REVIEWER_PASSWORD ?? "kumba-lets-2026";
  const authenticating = new AuthenticatingConcept(db);
  const verifying = new VerifyingConcept(db);
  try {
    await authenticating.register({ username: reviewer, password });
  } catch (error) {
    if (!(error instanceof UsernameTaken)) throw error;
  }
  try {
    await verifying.appoint({ reviewer });
  } catch (error) {
    if (!(error instanceof AlreadyAppointed)) throw error;
  }
}

/** Listings published before Expiring was wired have no timer; start one so they stay in search. */
async function seedOpenTimers() {
  const listings = new ListingConcept(db);
  const expiring = new ExpiringConcept(db);
  for (const { listing } of await listings._search({ area: "", maxRent: Number.MAX_SAFE_INTEGER })) {
    if ((await expiring._get({ resource: listing })).length === 0) {
      await expiring.start({ resource: listing, duration: LISTING_LIFETIME_MS });
    }
  }
}

await seedReviewer();
await seedOpenTimers();

const application = assembleApplication();
const gateway = createGateway({ application });
const api = withPhotoRoutes(
  withProofRoutes(createHttpHandler({ application, gateway, policy }), application),
  application,
);

const sweepEveryMs = LISTING_LIFETIME_MS < 5 * 60 * 1000 ? 2_000 : 10_000;
setInterval(() => {
  expireDue(application).catch((error) => console.error(error));
}, sweepEveryMs);

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/api/*": api,
    "/health": async () => {
      try {
        await db.command({ ping: 1 }, { timeoutMS: 3000 });
        return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return Response.json(
          { status: "unavailable" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    },
  },
});

console.log(`Backend listening on ${server.url}`);

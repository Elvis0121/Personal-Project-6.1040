import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { composition as availability } from "./compositions/Availability.ts";
import { composition as introductions } from "./compositions/Introductions.ts";
import { composition as listings } from "./compositions/Listings.ts";
import { composition as review } from "./compositions/Review.ts";
import { composition as sessions } from "./compositions/Sessions.ts";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";
import { ExpiringConcept } from "./concepts/Expiring.ts";
import { IntroducingConcept } from "./concepts/Introducing.ts";
import { ListingConcept } from "./concepts/Listing.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { VerifyingConcept } from "./concepts/Verifying.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";

/** Tests pass their own throwaway database and, for Expiring, a clock they can move. */
export function assembleApplication(database: Db = db, clock: () => Date = () => new Date()) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Authenticating: new AuthenticatingConcept(database),
      Sessioning: new SessioningConcept(database),
      Listing: new ListingConcept(database),
      Introducing: new IntroducingConcept(database),
      Verifying: new VerifyingConcept(database),
      Expiring: new ExpiringConcept(database, clock),
    },
    composition: {
      Sessions: sessions,
      Listings: listings,
      Introductions: introductions,
      Review: review,
      Availability: availability,
    },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}

/**
 * Expire every due timer so open listings are withdrawn. Not an HTTP button:
 * tests move a clock and call this; the server calls it on a timer.
 */
export async function expireDue(application: ReturnType<typeof assembleApplication>) {
  const due = await application.concepts.Expiring._due({});
  for (const { resource } of due) {
    await application.concepts.Expiring.expire({ resource });
  }
}

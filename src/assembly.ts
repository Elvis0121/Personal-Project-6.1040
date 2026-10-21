import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { composition as introductions } from "./compositions/Introductions.ts";
import { composition as listings } from "./compositions/Listings.ts";
import { composition as review } from "./compositions/Review.ts";
import { composition as sessions } from "./compositions/Sessions.ts";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";
import { IntroducingConcept } from "./concepts/Introducing.ts";
import { ListingConcept } from "./concepts/Listing.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { VerifyingConcept } from "./concepts/Verifying.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";

/** Tests pass their own throwaway database; the server uses the one in .env. */
export function assembleApplication(database: Db = db) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Authenticating: new AuthenticatingConcept(database),
      Sessioning: new SessioningConcept(database),
      Listing: new ListingConcept(database),
      Introducing: new IntroducingConcept(database),
      Verifying: new VerifyingConcept(database),
    },
    composition: { Sessions: sessions, Listings: listings, Introductions: introductions, Review: review },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}

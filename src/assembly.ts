import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as introductions } from "./compositions/Introductions.ts";
import { composition as listings } from "./compositions/Listings.ts";
import { composition as sessions } from "./compositions/Sessions.ts";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";
import { IntroducingConcept } from "./concepts/Introducing.ts";
import { ListingConcept } from "./concepts/Listing.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";

export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Authenticating: new AuthenticatingConcept(db),
      Sessioning: new SessioningConcept(db),
      Listing: new ListingConcept(db),
      Introducing: new IntroducingConcept(db),
    },
    composition: { Sessions: sessions, Listings: listings, Introductions: introductions },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}

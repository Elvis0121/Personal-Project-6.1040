import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import authenticatingSpec from "@design/concepts/Authenticating.md" with { type: "text" };
import introducingSpec from "@design/concepts/Introducing.md" with { type: "text" };
import expiringSpec from "@design/concepts/Expiring.md" with { type: "text" };
import listingSpec from "@design/concepts/Listing.md" with { type: "text" };
import sessioningSpec from "@design/concepts/Sessioning.md" with { type: "text" };
import verifyingSpec from "@design/concepts/Verifying.md" with { type: "text" };
import {
  AuthenticatingConcept,
  InvalidCredentials,
  InvalidUsername,
  UsernameTaken,
  WeakPassword,
} from "./concepts/Authenticating.ts";
import {
  AlreadyAnswered,
  AlreadyRequested,
  IntroducingConcept,
  MissingContact,
  NoSuchIntroduction,
  NotHolder,
  SelfIntroduction,
} from "./concepts/Introducing.ts";
import {
  AlreadyTimed,
  ExpiringConcept,
  InvalidDuration,
  NoSuchTimer,
  NotCurrent,
  StillCurrent,
} from "./concepts/Expiring.ts";
import {
  AlreadyOpen,
  InvalidTerms,
  ListingConcept,
  NegativeAmount,
  NoSuchListing,
  NotOpen,
  NotOwner,
} from "./concepts/Listing.ts";
import { SessioningConcept, UnknownSession } from "./concepts/Sessioning.ts";
import {
  AlreadyAppointed,
  AlreadyCurrent,
  EmptyEvidence,
  InvalidReviewer,
  NoSuchVerification,
  NotPending,
  NotReviewer,
  NotVerified,
  VerifyingConcept,
} from "./concepts/Verifying.ts";

const authenticating = registerConcept({
  class: AuthenticatingConcept,
  spec: authenticatingSpec,
  refusals: {
    INVALID_USERNAME: InvalidUsername,
    WEAK_PASSWORD: WeakPassword,
    USERNAME_TAKEN: UsernameTaken,
    INVALID_CREDENTIALS: InvalidCredentials,
  },
});

const sessioning = registerConcept({
  class: SessioningConcept,
  spec: sessioningSpec,
  refusals: { UNKNOWN_SESSION: UnknownSession },
});

const listing = registerConcept({
  class: ListingConcept,
  spec: listingSpec,
  refusals: {
    INVALID_TERMS: InvalidTerms,
    NEGATIVE_AMOUNT: NegativeAmount,
    NO_SUCH_LISTING: NoSuchListing,
    NOT_OWNER: NotOwner,
    NOT_OPEN: NotOpen,
    ALREADY_OPEN: AlreadyOpen,
  },
});

const expiring = registerConcept({
  class: ExpiringConcept,
  spec: expiringSpec,
  refusals: {
    INVALID_DURATION: InvalidDuration,
    ALREADY_TIMED: AlreadyTimed,
    NO_SUCH_TIMER: NoSuchTimer,
    NOT_CURRENT: NotCurrent,
    STILL_CURRENT: StillCurrent,
  },
});

const introducing = registerConcept({
  class: IntroducingConcept,
  spec: introducingSpec,
  refusals: {
    SELF_INTRODUCTION: SelfIntroduction,
    ALREADY_REQUESTED: AlreadyRequested,
    NO_SUCH_INTRODUCTION: NoSuchIntroduction,
    NOT_HOLDER: NotHolder,
    ALREADY_ANSWERED: AlreadyAnswered,
    MISSING_CONTACT: MissingContact,
  },
});

const verifying = registerConcept({
  class: VerifyingConcept,
  spec: verifyingSpec,
  refusals: {
    INVALID_REVIEWER: InvalidReviewer,
    ALREADY_APPOINTED: AlreadyAppointed,
    EMPTY_EVIDENCE: EmptyEvidence,
    ALREADY_CURRENT: AlreadyCurrent,
    NOT_REVIEWER: NotReviewer,
    NO_SUCH_VERIFICATION: NoSuchVerification,
    NOT_PENDING: NotPending,
    NOT_VERIFIED: NotVerified,
  },
});

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  Sessioning: sessioning,
  Listing: listing,
  Introducing: introducing,
  Verifying: verifying,
  Expiring: expiring,
});
export const { concepts } = applicationConceptSet;

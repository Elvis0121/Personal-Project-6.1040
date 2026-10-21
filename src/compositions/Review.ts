/**
 * The reviewer's queue of pending proof, and the decisions that follow.
 *
 * Verifying does not know about listings. This module passes the listing
 * identity as the subject and the session account as the reviewer. Evidence
 * is joined only here, and only after the session is confirmed as the reviewer.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, view, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Listing, Sessioning, Verifying } = concepts;

const AccessFlag = former("whether (user) is the reviewer", ({ user }, { appointed }) =>
  where(Verifying._isReviewer({ user }).is({ appointed })).form({ appointed }),
);

const Access = endpoint(
  "/review/access",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(respond({ access: AccessFlag({ user }) })),
  { input: { required: ["session"] } },
);

const ReviewerEvidence = view(
  "the evidence of (verification) for reviewer (reviewer)",
  ({ verification, reviewer }, { evidence }, _bindings) =>
    where(Verifying._evidence({ reviewer, verification }).is({ evidence })),
).optional();

const QueueItems = former(
  "the pending proof for (reviewer)",
  ({ reviewer }, { verification, advertiser, subject, location, kind, currency, rent, deposit, extras, moveIn, status, evidence }) =>
    form({
      items: each(Verifying._pending({}).is({ verification, advertiser, subject }))
        .where(
          whether(
            Listing._get({ listing: subject }).is({
              location,
              kind,
              currency,
              rent,
              deposit,
              extras,
              moveIn,
              status,
            }),
          ),
          whether(ReviewerEvidence({ verification, reviewer }).is({ evidence })),
        )
        .form({
          verification,
          advertiser,
          listing: subject,
          location,
          kind,
          currency,
          rent,
          deposit,
          extras,
          moveIn,
          status,
          evidence,
        }),
    }),
);

const Queue = endpoint(
  "/review/queue",
  ({ session, reviewer }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: reviewer }))
      .then(
        where(Verifying._isReviewer({ user: reviewer }).is({ appointed: true }))
          .then(respond({ queue: QueueItems({ reviewer }) }))
          .named("reviewer"),
        where(Verifying._isReviewer({ user: reviewer }).is({ appointed: false }))
          .then(respond({ error: "NOT_REVIEWER" }))
          .named("not-reviewer"),
      ),
  { input: { required: ["session"] } },
);

const Verify = endpoint(
  "/review/verify",
  ({ session, reviewer, verification }) =>
    receive({ session, verification })
      .then(Sessioning.current({ session }).responds({ subject: reviewer }))
      .then(Verifying.verify({ reviewer, verification }).responds({ verification }))
      .then(respond({ verification })),
  { input: { required: ["session", "verification"] } },
);

const Reject = endpoint(
  "/review/reject",
  ({ session, reviewer, verification }) =>
    receive({ session, verification })
      .then(Sessioning.current({ session }).responds({ subject: reviewer }))
      .then(Verifying.reject({ reviewer, verification }).responds({ verification }))
      .then(respond({ verification })),
  { input: { required: ["session", "verification"] } },
);

export const composition = {
  Access: { Access, AccessFlag },
  Queue: { Queue, QueueItems, ReviewerEvidence },
  Deciding: { Verify, Reject },
};

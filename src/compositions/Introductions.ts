/**
 * Asking a listing's owner for an introduction, answering it, and resetting
 * requests when a place is relisted.
 *
 * Introducing knows nothing about listings. This module decides that the holder
 * is the listing's owner, that only open listings can be asked about, and that
 * the contact released on acceptance is the one on the listing.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { form, former, no, reaction, view, when, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Expiring, Introducing, Listing, Sessioning } = concepts;

const OpenOwner = view(
  "the owner of open current (listing)",
  ({ listing }, { owner }, _bindings) =>
    where(
      Listing._get({ listing }).is({ owner, status: "OPEN" }),
      Expiring._isCurrent({ resource: listing }).is({ current: true }),
    ),
).optional();

const Request = endpoint(
  "/introductions/request",
  ({ session, requester, listing, owner, introduction }) =>
    receive({ session, listing })
      .then(Sessioning.current({ session }).responds({ subject: requester }))
      .then(
        where(OpenOwner({ listing }).is({ owner }))
          .then(
            Introducing.request({ requester, holder: owner, subject: listing }).responds({ introduction }),
          )
          .then(respond({ introduction }))
          .named("open"),
        where(no(OpenOwner({ listing })))
          .then(respond({ error: "NOT_OPEN" }))
          .named("not-open"),
      ),
  { input: { required: ["session", "listing"] } },
);

const MyIntroduction = former(
  "the introduction (requester) has about (listing)",
  ({ requester, listing }, { introduction, status, contact }) =>
    where(
      whether(Introducing._mine({ requester, subject: listing }).is({ introduction, status })),
      whether(Introducing._disclosed({ requester, subject: listing }).is({ contact })),
    ).form({ introduction, status, contact }),
);

const Mine = endpoint(
  "/introductions/mine",
  ({ session, requester, listing }) =>
    receive({ session, listing })
      .then(Sessioning.current({ session }).responds({ subject: requester }))
      .then(respond({ mine: MyIntroduction({ requester, listing }) })),
  { input: { required: ["session", "listing"] } },
);

const Accept = endpoint(
  "/introductions/accept",
  ({ session, holder, introduction, listing, contact }) =>
    receive({ session, introduction })
      .then(Sessioning.current({ session }).responds({ subject: holder }))
      .then(
        where(
          Introducing._get({ introduction }).is({ subject: listing }),
          Listing._contact({ listing }).is({ contact }),
        )
          .then(Introducing.accept({ holder, introduction, contact }).responds({ introduction }))
          .then(respond({ introduction }))
          .named("known"),
        where(no(Introducing._get({ introduction })))
          .then(respond({ error: "NO_SUCH_INTRODUCTION" }))
          .named("unknown"),
      ),
  { input: { required: ["session", "introduction"] } },
);

const Decline = endpoint(
  "/introductions/decline",
  ({ session, holder, introduction }) =>
    receive({ session, introduction })
      .then(Sessioning.current({ session }).responds({ subject: holder }))
      .then(Introducing.decline({ holder, introduction }).responds({ introduction }))
      .then(respond({ introduction })),
  { input: { required: ["session", "introduction"] } },
);

const ResetOnRelist = reaction(({ listing }) =>
  when(Listing.relist({}).responds({ listing })).then(Introducing.reset({ subject: listing })),
);

export const composition = {
  Asking: { OpenOwner, Request, MyIntroduction, Mine },
  Answering: { Accept, Decline },
  Reopening: { ResetOnRelist },
};

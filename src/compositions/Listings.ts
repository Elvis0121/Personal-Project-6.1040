/**
 * Publishing and managing one's own listings, and searching everyone's.
 *
 * Every owner action resolves the session first and passes its account to
 * Listing as the owner, so Listing's own NOT_OWNER refusal is the access check.
 * Verification is joined here as a flag or a proof status, never as evidence.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, when, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { OwnedOpen } from "./owned-open.ts";

const { Expiring, Introducing, Listing, Sessioning, Verifying } = concepts;

const Publish = endpoint(
  "/listings/publish",
  ({ session, owner, location, kind, currency, rent, deposit, extras, moveIn, contact, listing }) =>
    receive({ session, location, kind, currency, rent, deposit, extras, moveIn, contact })
      .then(Sessioning.current({ session }).responds({ subject: owner }))
      .then(
        Listing.publish({ owner, location, kind, currency, rent, deposit, extras, moveIn, contact })
          .responds({ listing }),
      )
      .then(respond({ listing })),
  {
    input: {
      required: ["session", "location", "kind", "currency", "rent", "deposit", "extras", "moveIn", "contact"],
    },
  },
);

const MarkLet = endpoint(
  "/listings/mark-let",
  ({ session, owner, listing }) =>
    receive({ session, listing })
      .then(Sessioning.current({ session }).responds({ subject: owner }))
      .then(Listing.markLet({ owner, listing }).responds({ listing }))
      .then(respond({ listing })),
  { input: { required: ["session", "listing"] } },
);

const Relist = endpoint(
  "/listings/relist",
  ({ session, owner, listing }) =>
    receive({ session, listing })
      .then(Sessioning.current({ session }).responds({ subject: owner }))
      .then(Listing.relist({ owner, listing }).responds({ listing }))
      .then(respond({ listing })),
  { input: { required: ["session", "listing"] } },
);

const Withdraw = endpoint(
  "/listings/withdraw",
  ({ session, owner, listing }) =>
    receive({ session, listing })
      .then(Sessioning.current({ session }).responds({ subject: owner }))
      .then(Listing.withdraw({ owner, listing }).responds({ listing }))
      .then(respond({ listing })),
  { input: { required: ["session", "listing"] } },
);

const Update = endpoint(
  "/listings/update",
  ({ session, owner, listing, location, kind, currency, rent, deposit, extras, moveIn, contact }) =>
    receive({ session, listing, location, kind, currency, rent, deposit, extras, moveIn, contact })
      .then(Sessioning.current({ session }).responds({ subject: owner }))
      .then(
        Listing.update({
          owner,
          listing,
          location,
          kind,
          currency,
          rent,
          deposit,
          extras,
          moveIn,
          contact,
        }).responds({ listing }),
      )
      .then(respond({ listing })),
  {
    input: {
      required: [
        "session",
        "listing",
        "location",
        "kind",
        "currency",
        "rent",
        "deposit",
        "extras",
        "moveIn",
        "contact",
      ],
    },
  },
);

const RevokeOnMove = reaction(({ listing, previousLocation }) =>
  when(Listing.update({}).responds({ listing, previousLocation }))
    .where(
      Listing._get({ listing }).is.not({ location: previousLocation }),
      Verifying._isVerified({ subject: listing }).is({ verified: true }),
    )
    .then(Verifying.revoke({ subject: listing })),
);

const SubmitProof = endpoint(
  "/listings/submit-proof",
  ({ session, advertiser, listing, evidence, verification }) =>
    receive({ session, listing, evidence })
      .then(Sessioning.current({ session }).responds({ subject: advertiser }))
      .then(
        where(OwnedOpen({ listing }).is({ owner: advertiser }))
          .then(
            Verifying.submit({ advertiser, subject: listing, evidence }).responds({ verification }),
          )
          .then(respond({ verification }))
          .named("owner-open"),
        where(no(Listing._get({ listing })))
          .then(respond({ error: "NO_SUCH_LISTING" }))
          .named("missing"),
        where(Listing._get({ listing }).is.not({ owner: advertiser }))
          .then(respond({ error: "NOT_OWNER" }))
          .named("not-owner"),
        where(Listing._get({ listing }).is({ owner: advertiser }).is.not({ status: "OPEN" }))
          .then(respond({ error: "NOT_OPEN" }))
          .named("not-open"),
      ),
  { input: { required: ["session", "listing", "evidence"] } },
);

const OwnListings = former(
  "the listings of (owner)",
  (
    { owner },
    {
      listing,
      location,
      kind,
      currency,
      rent,
      deposit,
      extras,
      moveIn,
      contact,
      status,
      proof,
      deadline,
      current,
      introduction,
      requester,
      answer,
    },
  ) =>
    form({
      listings: each(
        Listing._byOwner({ owner }).is({
          listing,
          location,
          kind,
          currency,
          rent,
          deposit,
          extras,
          moveIn,
          contact,
          status,
        }),
      )
        .where(
          whether(Verifying._forSubject({ subject: listing }).is({ status: proof })),
          whether(Expiring._get({ resource: listing }).is({ deadline })),
          Expiring._isCurrent({ resource: listing }).is({ current }),
        )
        .form({
          listing,
          location,
          kind,
          currency,
          rent,
          deposit,
          extras,
          moveIn,
          contact,
          status,
          proof,
          deadline,
          current,
          requests: each(
            Introducing._received({ holder: owner, subject: listing }).is({ introduction, requester, status: answer }),
          ).form({ introduction, requester, status: answer }),
        }),
    }),
);

const Mine = endpoint(
  "/listings/mine",
  ({ session, owner }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: owner }))
      .then(respond({ mine: OwnListings({ owner }) })),
  { input: { required: ["session"] } },
);

const Results = former(
  "the open listings in (area) up to (maxRent)",
  ({ area, maxRent }, { listing, location, kind, currency, rent, deposit, extras, moveIn, verified }) =>
    form({
      listings: each(
        Listing._search({ area, maxRent }).is({
          listing,
          location,
          kind,
          currency,
          rent,
          deposit,
          extras,
          moveIn,
        }),
      )
        .where(
          Verifying._isVerified({ subject: listing }).is({ verified }),
          Expiring._isCurrent({ resource: listing }).is({ current: true }),
        )
        .form({ listing, location, kind, currency, rent, deposit, extras, moveIn, verified }),
    }),
);

const Search = endpoint(
  "/listings/search",
  ({ area, maxRent }) =>
    receive({ area, maxRent }).then(respond({ results: Results({ area, maxRent }) })),
  { input: { required: ["area", "maxRent"] } },
);

const Terms = former(
  "the terms of (listing)",
  ({ listing }, { owner, location, kind, currency, rent, deposit, extras, moveIn, status, verified, current }) =>
    where(
      Listing._get({ listing }).is({ owner, location, kind, currency, rent, deposit, extras, moveIn, status }),
      Verifying._isVerified({ subject: listing }).is({ verified }),
      Expiring._isCurrent({ resource: listing }).is({ current }),
    ).form({ listing, owner, location, kind, currency, rent, deposit, extras, moveIn, status, verified, current }),
).optional();

const View = endpoint(
  "/listings/view",
  ({ listing }) =>
    receive({ listing }).then(
      where(Listing._get({ listing }))
        .then(respond({ terms: Terms({ listing }) }))
        .named("found"),
      where(no(Listing._get({ listing })))
        .then(respond({ error: "NO_SUCH_LISTING" }))
        .named("missing"),
    ),
  { input: { required: ["listing"] } },
);

export const composition = {
  Advertising: { Publish, MarkLet, Relist, Withdraw, Update, SubmitProof, Mine, OwnListings, RevokeOnMove, OwnedOpen },
  Searching: { Search, Results, View, Terms },
};

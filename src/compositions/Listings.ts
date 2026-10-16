/**
 * Publishing and managing one's own listings, and searching everyone's.
 *
 * Every owner action resolves the session first and passes its account to
 * Listing as the owner, so Listing's own NOT_OWNER refusal is the access check.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Introducing, Listing, Sessioning } = concepts;

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

const OwnListings = former(
  "the listings of (owner)",
  (
    { owner },
    { listing, location, kind, currency, rent, deposit, extras, moveIn, contact, status, introduction, requester, answer },
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
      ).form({
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
  ({ area, maxRent }, { listing, location, kind, currency, rent, deposit, extras, moveIn }) =>
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
      ).form({ listing, location, kind, currency, rent, deposit, extras, moveIn }),
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
  ({ listing }, { owner, location, kind, currency, rent, deposit, extras, moveIn, status }) =>
    where(
      Listing._get({ listing }).is({ owner, location, kind, currency, rent, deposit, extras, moveIn, status }),
    ).form({ listing, owner, location, kind, currency, rent, deposit, extras, moveIn, status }),
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
  Advertising: { Publish, MarkLet, Relist, Mine, OwnListings },
  Searching: { Search, Results, View, Terms },
};

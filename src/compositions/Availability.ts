/**
 * 30-day availability around listings.
 *
 * Expiring does not know what a listing is. This module starts and renews
 * timers on listing identities, and withdraws an open listing when its timer
 * expires. Letting stays a separate action: a lapsed listing is withdrawn, not
 * marked let.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { LISTING_LIFETIME_MS } from "../listing-lifetime.ts";
import { OwnedOpen } from "./owned-open.ts";

const { Expiring, Listing, Sessioning } = concepts;

const StartOnPublish = reaction(({ listing }) =>
  when(Listing.publish({}).responds({ listing })).then(
    Expiring.start({ resource: listing, duration: LISTING_LIFETIME_MS }),
  ),
);

const TimerOnRelist = reaction(({ listing }) =>
  when(Listing.relist({}).responds({ listing })).then(
    where(no(Expiring._get({ resource: listing })))
      .then(Expiring.start({ resource: listing, duration: LISTING_LIFETIME_MS }))
      .named("fresh"),
    where(Expiring._get({ resource: listing }))
      .then(Expiring.reschedule({ resource: listing, duration: LISTING_LIFETIME_MS }))
      .named("existing"),
  ),
);

const Confirm = endpoint(
  "/listings/confirm",
  ({ session, owner, listing, resource, deadline }) =>
    receive({ session, listing })
      .then(Sessioning.current({ session }).responds({ subject: owner }))
      .then(
        where(OwnedOpen({ listing }).is({ owner }))
          .then(
            Expiring.renew({ resource: listing, duration: LISTING_LIFETIME_MS }).responds({
              resource,
              deadline,
            }),
          )
          .then(respond({ listing: resource, deadline }))
          .named("owner-open"),
        where(no(Listing._get({ listing })))
          .then(respond({ error: "NO_SUCH_LISTING" }))
          .named("missing"),
        where(Listing._get({ listing }).is.not({ owner }))
          .then(respond({ error: "NOT_OWNER" }))
          .named("not-owner"),
        where(Listing._get({ listing }).is({ owner }).is.not({ status: "OPEN" }))
          .then(respond({ error: "NOT_OPEN" }))
          .named("not-open"),
      ),
  { input: { required: ["session", "listing"] } },
);

const WithdrawOnExpire = reaction(({ listing, owner }) =>
  when(Expiring.expire({}).responds({ resource: listing }))
    .where(Listing._get({ listing }).is({ owner, status: "OPEN" }))
    .then(Listing.withdraw({ owner, listing })),
);

export const composition = {
  Timers: { StartOnPublish, TimerOnRelist },
  Confirming: { Confirm },
  Lapse: { WithdrawOnExpire },
};

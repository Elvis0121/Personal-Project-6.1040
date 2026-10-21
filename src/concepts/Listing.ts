import type { Collection, Db } from "mongodb";

export class InvalidTerms extends Error {}
export class NegativeAmount extends Error {}
export class NoSuchListing extends Error {}
export class NotOwner extends Error {}
export class NotOpen extends Error {}
export class AlreadyOpen extends Error {}

export type Status = "OPEN" | "LET" | "WITHDRAWN";

interface Terms {
  location: string;
  kind: string;
  currency: string;
  rent: number;
  deposit: number;
  extras: string;
  /** A calendar date written as YYYY-MM-DD. */
  moveIn: string;
  contact: string;
}

interface ListingDoc extends Terms {
  _id: string;
  owner: string;
  status: Status;
}

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Checks the terms and answers them with surrounding spaces removed. */
function acceptedTerms(terms: Terms): Terms {
  const text = [terms.location, terms.kind, terms.currency, terms.contact, terms.extras];
  const blank = text.some((value) => typeof value !== "string") ||
    [terms.location, terms.kind, terms.currency, terms.contact].some((value) => value.trim() === "");
  const numbers = Number.isFinite(terms.rent) && Number.isFinite(terms.deposit);
  const date =
    typeof terms.moveIn === "string" &&
    CALENDAR_DATE.test(terms.moveIn) &&
    !Number.isNaN(Date.parse(terms.moveIn));
  if (blank || !numbers || !date) {
    throw new InvalidTerms(
      "A listing needs a location, a kind of place, a currency, a move-in date, and a contact number.",
    );
  }
  if (terms.rent < 0 || terms.deposit < 0) {
    throw new NegativeAmount("Rent and deposit cannot be negative.");
  }
  return {
    location: terms.location.trim(),
    kind: terms.kind.trim(),
    currency: terms.currency.trim(),
    rent: terms.rent,
    deposit: terms.deposit,
    extras: terms.extras.trim(),
    moveIn: terms.moveIn,
    contact: terms.contact.trim(),
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class ListingConcept {
  private readonly listings: Collection<ListingDoc>;

  constructor(db: Db) {
    this.listings = db.collection<ListingDoc>("listing.listings");
  }

  async publish({ owner, ...terms }: { owner: string } & Terms) {
    const accepted = acceptedTerms(terms);
    // Version 7 UUIDs sort by creation time, which orders "newest first".
    const listing = Bun.randomUUIDv7();
    await this.listings.insertOne({ _id: listing, owner, ...accepted, status: "OPEN" });
    return { listing };
  }

  async update({ owner, listing, ...terms }: { owner: string; listing: string } & Terms) {
    const found = await this.#owned(owner, listing, "OPEN");
    const accepted = acceptedTerms(terms);
    const result = await this.listings.updateOne(
      { _id: listing, owner, status: "OPEN" },
      { $set: accepted },
    );
    if (result.matchedCount === 0) throw new NotOpen("This listing is not open.");
    return { listing, previousLocation: found.location };
  }

  async markLet({ owner, listing }: { owner: string; listing: string }) {
    await this.#owned(owner, listing, "OPEN");
    await this.#move(listing, "OPEN", "LET");
    return { listing };
  }

  async withdraw({ owner, listing }: { owner: string; listing: string }) {
    await this.#owned(owner, listing, "OPEN");
    await this.#move(listing, "OPEN", "WITHDRAWN");
    return { listing };
  }

  async relist({ owner, listing }: { owner: string; listing: string }) {
    const found = await this.#owned(owner, listing);
    if (found.status === "OPEN") throw new AlreadyOpen("This listing is already open.");
    const result = await this.listings.updateOne(
      { _id: listing, status: { $ne: "OPEN" } },
      { $set: { status: "OPEN" } },
    );
    if (result.matchedCount === 0) throw new AlreadyOpen("This listing is already open.");
    return { listing };
  }

  async _search({ area, maxRent }: { area: string; maxRent: number }) {
    // A query cannot refuse, so a non-text area or a non-number maxRent
    // answers no rows instead of throwing (which would become INTERNAL_ERROR).
    if (typeof area !== "string" || !Number.isFinite(maxRent)) return [];
    const filter: Record<string, unknown> = { status: "OPEN", rent: { $lte: maxRent } };
    if (area.trim() !== "") {
      filter.location = { $regex: escapeRegex(area.trim()), $options: "i" };
    }
    const rows = await this.listings.find(filter).sort({ rent: 1, _id: 1 }).toArray();
    return rows.map(({ _id, location, kind, currency, rent, deposit, extras, moveIn }) => ({
      listing: _id,
      location,
      kind,
      currency,
      rent,
      deposit,
      extras,
      moveIn,
    }));
  }

  async _get({ listing }: { listing: string }) {
    const found = await this.listings.findOne({ _id: listing });
    if (!found) return [];
    const { owner, location, kind, currency, rent, deposit, extras, moveIn, status } = found;
    return [{ owner, location, kind, currency, rent, deposit, extras, moveIn, status }];
  }

  async _byOwner({ owner }: { owner: string }) {
    const rows = await this.listings.find({ owner }).sort({ _id: -1 }).toArray();
    return rows.map(({ _id, location, kind, currency, rent, deposit, extras, moveIn, contact, status }) => ({
      listing: _id,
      location,
      kind,
      currency,
      rent,
      deposit,
      extras,
      moveIn,
      contact,
      status,
    }));
  }

  async _contact({ listing }: { listing: string }) {
    const found = await this.listings.findOne({ _id: listing });
    return found ? [{ contact: found.contact }] : [];
  }

  /** The listing, refusing when it is unknown, someone else's, or not in the required status. */
  async #owned(owner: string, listing: string, required?: Status): Promise<ListingDoc> {
    const found = await this.listings.findOne({ _id: listing });
    if (!found) throw new NoSuchListing("There is no such listing.");
    if (found.owner !== owner) throw new NotOwner("Only the advertiser can change this listing.");
    if (required && found.status !== required) throw new NotOpen("This listing is not open.");
    return found;
  }

  /** Changes the status only if nobody changed it since it was read. */
  async #move(listing: string, from: Status, to: Status) {
    const result = await this.listings.updateOne({ _id: listing, status: from }, { $set: { status: to } });
    if (result.matchedCount === 0) throw new NotOpen("This listing is not open.");
  }
}

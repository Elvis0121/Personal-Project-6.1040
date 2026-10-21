import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadyOpen,
  InvalidTerms,
  ListingConcept,
  NegativeAmount,
  NoSuchListing,
  NotOpen,
  NotOwner,
} from "../../src/concepts/Listing.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let listings: ListingConcept;

const cottage = {
  location: "Avondale, Harare",
  kind: "Cottage",
  currency: "USD",
  rent: 150,
  deposit: 150,
  extras: "Water billed separately. No viewing fee.",
  moveIn: "2026-11-01",
  contact: "0772 429 864",
};

beforeAll(async () => {
  testDb = await openTestDb();
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  listings = new ListingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: terms are visible while open, the contact never is, and only the owner closes it", async () => {
  const { listing } = await listings.publish({ owner: "mrsdube", ...cottage });

  const found = await listings._search({ area: "avondale", maxRent: 200 });
  expect(found).toHaveLength(1);
  expect(found[0]).toMatchObject({ listing, location: "Avondale, Harare", rent: 150, deposit: 150 });
  expect(JSON.stringify(found)).not.toContain(cottage.contact);
  expect(JSON.stringify(await listings._get({ listing }))).not.toContain(cottage.contact);

  await expect(listings.markLet({ owner: "tinashe", listing })).rejects.toBeInstanceOf(NotOwner);
  await listings.markLet({ owner: "mrsdube", listing });
  expect(await listings._search({ area: "avondale", maxRent: 200 })).toEqual([]);
  expect((await listings._get({ listing }))[0]?.status).toBe("LET");

  await listings.relist({ owner: "mrsdube", listing });
  expect(await listings._search({ area: "avondale", maxRent: 200 })).toHaveLength(1);
});

test("search filters by area and maximum rent, cheapest first", async () => {
  await listings.publish({ owner: "mrsdube", ...cottage, rent: 180 });
  await listings.publish({ owner: "mrmoyo", ...cottage, location: "Belvedere", rent: 400 });
  await listings.publish({ owner: "mrsdube", ...cottage, kind: "Room", rent: 90 });

  const cheap = await listings._search({ area: "", maxRent: 200 });
  expect(cheap.map(({ rent }) => rent)).toEqual([90, 180]);
  expect(await listings._search({ area: "belvedere", maxRent: 500 })).toHaveLength(1);
  expect(await listings._search({ area: "borrowdale", maxRent: 500 })).toEqual([]);
  // Search text is matched literally, not as a pattern.
  expect(await listings._search({ area: ".*", maxRent: 500 })).toEqual([]);
  // Bad types answer no rows instead of throwing.
  expect(await listings._search({ area: 200 as unknown as string, maxRent: 500 })).toEqual([]);
  expect(await listings._search({ area: "avondale", maxRent: "200" as unknown as number })).toEqual([]);
});

test("incomplete or negative terms are refused", async () => {
  await expect(listings.publish({ owner: "mrsdube", ...cottage, contact: "  " })).rejects.toBeInstanceOf(
    InvalidTerms,
  );
  await expect(listings.publish({ owner: "mrsdube", ...cottage, moveIn: "next week" })).rejects.toBeInstanceOf(
    InvalidTerms,
  );
  await expect(
    listings.publish({ owner: "mrsdube", ...cottage, rent: "150" as unknown as number }),
  ).rejects.toBeInstanceOf(InvalidTerms);
  await expect(listings.publish({ owner: "mrsdube", ...cottage, deposit: -1 })).rejects.toBeInstanceOf(
    NegativeAmount,
  );
  expect(await listings._byOwner({ owner: "mrsdube" })).toEqual([]);
});

test("the owner sees their own listings with contacts, newest first", async () => {
  const first = await listings.publish({ owner: "mrsdube", ...cottage });
  const second = await listings.publish({ owner: "mrsdube", ...cottage, kind: "Room" });
  await listings.publish({ owner: "mrmoyo", ...cottage });

  const mine = await listings._byOwner({ owner: "mrsdube" });
  expect(mine.map(({ listing }) => listing)).toEqual([second.listing, first.listing]);
  expect(mine[0]).toMatchObject({ contact: cottage.contact, status: "OPEN" });
  expect(await listings._contact({ listing: first.listing })).toEqual([{ contact: cottage.contact }]);
});

test("only an open listing can be updated, let, or withdrawn, and only a closed one relisted", async () => {
  const { listing } = await listings.publish({ owner: "mrsdube", ...cottage });
  expect(await listings.update({ owner: "mrsdube", listing, ...cottage, rent: 160 })).toEqual({
    listing,
    previousLocation: cottage.location,
  });
  expect((await listings._get({ listing }))[0]?.rent).toBe(160);
  await expect(listings.relist({ owner: "mrsdube", listing })).rejects.toBeInstanceOf(AlreadyOpen);

  await listings.withdraw({ owner: "mrsdube", listing });
  await expect(listings.markLet({ owner: "mrsdube", listing })).rejects.toBeInstanceOf(NotOpen);
  await expect(listings.update({ owner: "mrsdube", listing, ...cottage })).rejects.toBeInstanceOf(NotOpen);
  await expect(listings.withdraw({ owner: "tinashe", listing })).rejects.toBeInstanceOf(NotOwner);
  await expect(listings.markLet({ owner: "mrsdube", listing: "missing" })).rejects.toBeInstanceOf(
    NoSuchListing,
  );
  expect(await listings._get({ listing: "missing" })).toEqual([]);
});

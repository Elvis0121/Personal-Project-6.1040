/**
 * 30-day availability: confirm renews the timer, a lapsed listing leaves
 * search, and expire withdraws it. Tests move a clock; there is no expire button.
 */
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication, expireDue } from "../src/assembly.ts";
import { LISTING_LIFETIME_MS } from "../src/listing-lifetime.ts";
import { policy } from "../src/http.ts";
import { openTestDb, type TestDb } from "./test-db.ts";

const ORIGIN = "http://127.0.0.1:8080";

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

let testDb: TestDb;
let now: Date;
let application: ReturnType<typeof assembleApplication>;
let handle: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-21T12:00:00Z");
  application = assembleApplication(testDb.db, () => now);
  handle = createHttpHandler({ application, gateway: createGateway({ application }), policy });
});

afterAll(async () => {
  await testDb.close();
});

async function post(path: string, body: object, cookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: ORIGIN };
  if (cookie) headers.Cookie = cookie;
  const response = await handle(
    new Request(`http://127.0.0.1:3000/api${path}`, { method: "POST", headers, body: JSON.stringify(body) }),
  );
  return { status: response.status, body: await response.json(), setCookie: response.headers.get("set-cookie") };
}

async function register(username: string, password: string): Promise<string> {
  const { status, setCookie } = await post("/auth/register", { username, password });
  expect(status).toBe(200);
  return setCookie!.split(";")[0]!;
}

test("confirm renews the deadline; a lapsed listing leaves search and is withdrawn, not let", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;

  const mine = await post("/listings/mine", {}, dube);
  expect(mine.body.mine.listings[0]).toMatchObject({ listing, status: "OPEN", current: true });
  const firstDeadline = Date.parse(mine.body.mine.listings[0].deadline);
  expect(firstDeadline).toBe(now.getTime() + LISTING_LIFETIME_MS);

  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings).toHaveLength(1);

  expect((await post("/listings/confirm", { listing }, tinashe)).body).toEqual({ error: "FORBIDDEN" });

  expect((await post("/listings/confirm", { listing }, dube)).status).toBe(200);
  now = new Date(now.getTime() + 1000);
  expect((await post("/listings/confirm", { listing }, dube)).status).toBe(200);
  const second = Date.parse((await post("/listings/mine", {}, dube)).body.mine.listings[0].deadline);
  expect(second).toBe(now.getTime() + LISTING_LIFETIME_MS);
  expect(second).toBeGreaterThan(firstDeadline);

  now = new Date(now.getTime() + Math.floor(LISTING_LIFETIME_MS / 3));
  expect((await post("/listings/confirm", { listing }, dube)).status).toBe(200);
  const renewed = Date.parse((await post("/listings/mine", {}, dube)).body.mine.listings[0].deadline);
  expect(renewed).toBe(now.getTime() + LISTING_LIFETIME_MS);
  expect(renewed).toBeGreaterThan(second);

  now = new Date(renewed + 1);
  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings).toEqual([]);
  expect((await post("/listings/view", { listing })).body.terms).toMatchObject({ status: "OPEN", current: false });
  expect((await post("/introductions/request", { listing }, tinashe)).body).toEqual({ error: "CONFLICT" });
  expect((await post("/listings/confirm", { listing }, dube)).body).toEqual({ error: "CONFLICT" });
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0]).toMatchObject({
    status: "OPEN",
    current: false,
  });

  await expireDue(application);
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0]).toMatchObject({
    listing,
    status: "WITHDRAWN",
    current: false,
  });
  expect((await post("/listings/view", { listing })).body.terms.status).toBe("WITHDRAWN");

  expect((await post("/listings/relist", { listing }, dube)).status).toBe(200);
  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings).toHaveLength(1);
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0]).toMatchObject({
    status: "OPEN",
    current: true,
  });
});

test("the owner cannot confirm a listing after it is let", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  expect((await post("/listings/mark-let", { listing }, dube)).status).toBe(200);
  expect((await post("/listings/confirm", { listing }, dube)).body).toEqual({ error: "CONFLICT" });
});

test("a let listing is not withdrawn when its timer expires; relist starts a fresh timer", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  const deadline = Date.parse((await post("/listings/mine", {}, dube)).body.mine.listings[0].deadline);

  expect((await post("/listings/mark-let", { listing }, dube)).status).toBe(200);
  now = new Date(deadline + 1);
  await expireDue(application);
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0].status).toBe("LET");

  expect((await post("/listings/relist", { listing }, dube)).status).toBe(200);
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0]).toMatchObject({
    status: "OPEN",
    current: true,
  });
});

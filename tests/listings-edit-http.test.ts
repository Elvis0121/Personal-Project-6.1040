/**
 * Edit and withdraw on My listings. A location change revokes VERIFIED;
 * a rent change does not.
 */
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
import { VerifyingConcept } from "../src/concepts/Verifying.ts";
import { policy } from "../src/http.ts";
import { openTestDb, type TestDb } from "./test-db.ts";

const ORIGIN = "http://127.0.0.1:8080";
const bill = "rates bill, City of Harare, Avondale cottage, Sept 2026";

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
let handle: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  const application = assembleApplication(testDb.db);
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

test("the owner can edit terms and withdraw; a stranger cannot", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;

  expect((await post("/listings/update", { listing, ...cottage, rent: 160 }, tinashe)).body).toEqual({
    error: "FORBIDDEN",
  });
  expect((await post("/listings/withdraw", { listing }, tinashe)).body).toEqual({ error: "FORBIDDEN" });

  expect((await post("/listings/update", { listing, ...cottage, rent: 160 }, dube)).status).toBe(200);
  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings[0].rent).toBe(160);

  expect((await post("/listings/withdraw", { listing }, dube)).status).toBe(200);
  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings).toEqual([]);
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0].status).toBe("WITHDRAWN");
  expect((await post("/listings/update", { listing, ...cottage }, dube)).body).toEqual({ error: "CONFLICT" });

  expect((await post("/listings/relist", { listing }, dube)).status).toBe(200);
  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings).toHaveLength(1);
});

test("moving a verified listing revokes VERIFIED; changing the rent does not", async () => {
  const kumba = await register("kumba", "kumba-lets-2026");
  await new VerifyingConcept(testDb.db).appoint({ reviewer: "kumba" });
  const dube = await register("mrsdube", "avondale-cottage");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  expect((await post("/listings/submit-proof", { listing, evidence: bill }, dube)).status).toBe(200);
  const { verification } = (await post("/review/queue", {}, kumba)).body.queue.items[0];
  expect((await post("/review/verify", { verification }, kumba)).status).toBe(200);
  expect((await post("/listings/view", { listing })).body.terms.verified).toBe(true);

  expect((await post("/listings/update", { listing, ...cottage, rent: 175 }, dube)).status).toBe(200);
  expect((await post("/listings/view", { listing })).body.terms.verified).toBe(true);

  expect((await post("/listings/withdraw", { listing }, dube)).status).toBe(200);
  expect((await post("/listings/relist", { listing }, dube)).status).toBe(200);
  expect((await post("/listings/view", { listing })).body.terms.verified).toBe(true);

  expect(
    (await post("/listings/update", { listing, ...cottage, rent: 175, location: "Belvedere, Harare" }, dube)).status,
  ).toBe(200);
  expect((await post("/listings/view", { listing })).body.terms).toMatchObject({
    location: "Belvedere, Harare",
    verified: false,
  });
});

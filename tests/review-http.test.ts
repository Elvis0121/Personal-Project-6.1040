/**
 * Submit proof, the reviewer's queue, and the VERIFIED label on search and
 * listing. Evidence must never appear in those public responses.
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

test("kumba verifies a listing; tenants see VERIFIED and never the evidence", async () => {
  const kumba = await register("kumba", "kumba-lets-2026");
  await new VerifyingConcept(testDb.db).appoint({ reviewer: "kumba" });
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;

  expect((await post("/review/access", {}, kumba)).body.access.appointed).toBe(true);
  expect((await post("/review/access", {}, tinashe)).body.access.appointed).toBe(false);
  expect((await post("/review/queue", {}, tinashe)).body).toEqual({ error: "FORBIDDEN" });
  expect((await post("/review/queue", {})).body).toEqual({ error: "UNAUTHORIZED" });

  expect((await post("/listings/submit-proof", { listing, evidence: "" }, dube)).body).toEqual({
    error: "INVALID_REQUEST",
  });
  expect((await post("/listings/submit-proof", { listing, evidence: bill }, tinashe)).body).toEqual({
    error: "FORBIDDEN",
  });

  const submitted = await post("/listings/submit-proof", { listing, evidence: bill }, dube);
  expect(submitted.status).toBe(200);
  expect((await post("/listings/submit-proof", { listing, evidence: bill }, dube)).body).toEqual({
    error: "CONFLICT",
  });

  const mine = await post("/listings/mine", {}, dube);
  expect(mine.body.mine.listings[0].proof).toBe("PENDING");
  expect(JSON.stringify(mine.body)).not.toContain("rates");

  const before = await post("/listings/search", { area: "avondale", maxRent: 200 });
  expect(before.body.results.listings[0]).toMatchObject({ listing, verified: false });
  const viewBefore = await post("/listings/view", { listing });
  expect(viewBefore.body.terms).toMatchObject({ verified: false });
  expect(JSON.stringify([before.body, viewBefore.body])).not.toContain("rates");

  const queue = await post("/review/queue", {}, kumba);
  expect(queue.status).toBe(200);
  expect(queue.body.queue.items).toHaveLength(1);
  expect(queue.body.queue.items[0]).toMatchObject({
    advertiser: "mrsdube",
    listing,
    evidence: bill,
    location: cottage.location,
    rent: 150,
  });

  expect((await post("/review/verify", { verification: queue.body.queue.items[0].verification }, tinashe)).body).toEqual(
    { error: "FORBIDDEN" },
  );
  expect((await post("/review/verify", { verification: queue.body.queue.items[0].verification }, kumba)).status).toBe(
    200,
  );

  const after = await post("/listings/search", { area: "avondale", maxRent: 200 });
  expect(after.body.results.listings[0]).toMatchObject({ listing, verified: true });
  const viewAfter = await post("/listings/view", { listing });
  expect(viewAfter.body.terms).toMatchObject({ verified: true, owner: "mrsdube", status: "OPEN" });
  expect(JSON.stringify([after.body, viewAfter.body])).not.toContain("rates");
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0].proof).toBe("VERIFIED");
  expect((await post("/review/queue", {}, kumba)).body.queue.items).toEqual([]);
});

test("a let listing cannot take new proof, and reject lets the owner submit again", async () => {
  const kumba = await register("kumba", "kumba-lets-2026");
  await new VerifyingConcept(testDb.db).appoint({ reviewer: "kumba" });
  const dube = await register("mrsdube", "avondale-cottage");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;

  expect((await post("/listings/mark-let", { listing }, dube)).status).toBe(200);
  expect((await post("/listings/submit-proof", { listing, evidence: bill }, dube)).body).toEqual({
    error: "CONFLICT",
  });

  expect((await post("/listings/relist", { listing }, dube)).status).toBe(200);
  const first = await post("/listings/submit-proof", { listing, evidence: bill }, dube);
  expect(first.status).toBe(200);

  const queue = await post("/review/queue", {}, kumba);
  expect((await post("/review/reject", { verification: queue.body.queue.items[0].verification }, kumba)).status).toBe(
    200,
  );
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0].proof).toBeNull();
  expect((await post("/listings/submit-proof", { listing, evidence: "title deed, Avondale, 2024" }, dube)).status).toBe(
    200,
  );
  expect(JSON.stringify((await post("/listings/search", { area: "avondale", maxRent: 200 })).body)).not.toContain(
    "title deed",
  );
});

import { expect, test } from "bun:test";
import { checkProofFile } from "../src/proof-docs.ts";
import { formatEvidence, parseEvidence } from "../src/proof.ts";

test("old free-text proof stays a note, with no kind or file", () => {
  const raw = "rates bill, City of Harare, Avondale cottage, Sept 2026";
  expect(parseEvidence(raw)).toEqual({ kind: undefined, filename: undefined, note: raw });
});

test("kind, file, and note round-trip", () => {
  const evidence = formatEvidence({
    kind: "Water bill",
    filename: "city-water.pdf",
    note: "City of Harare, Sept 2026",
  });
  expect(evidence).toBe("Water bill\nfile:city-water.pdf\nCity of Harare, Sept 2026");
  expect(parseEvidence(evidence)).toEqual({
    kind: "Water bill",
    filename: "city-water.pdf",
    note: "City of Harare, Sept 2026",
  });
});

test("rejects a document that is not a PDF or image", () => {
  expect(() => checkProofFile(new File(["hello"], "notes.txt", { type: "text/plain" }))).toThrow("type");
  expect(() => checkProofFile(new File([], "empty.pdf", { type: "application/pdf" }))).toThrow("empty");
});

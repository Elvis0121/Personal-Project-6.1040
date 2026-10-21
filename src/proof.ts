/** How the advertiser classifies a document. Stored as the first line of evidence. */
export const PROOF_KINDS = [
  "Rates bill",
  "Water bill",
  "Electricity bill",
  "Title deed",
  "Lease",
  "Other",
] as const;

export type ProofKind = (typeof PROOF_KINDS)[number];

export function parseEvidence(raw: string) {
  const lines = raw.split("\n");
  const kind = PROOF_KINDS.find((item) => item === lines[0]);
  let index = kind ? 1 : 0;
  let filename: string | undefined;
  if (lines[index]?.startsWith("file:")) {
    filename = lines[index]!.slice(5);
    index += 1;
  }
  return { kind, filename, note: lines.slice(index).join("\n").trim() };
}

export function formatEvidence(input: { kind?: string; filename?: string; note?: string }) {
  const lines: string[] = [];
  if (input.kind) lines.push(input.kind);
  if (input.filename) lines.push(`file:${input.filename}`);
  if (input.note?.trim()) lines.push(input.note.trim());
  return lines.join("\n");
}

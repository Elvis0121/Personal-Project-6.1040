/**
 * Owner of an OPEN listing. Confirm, submit-proof, and the file door
 * all use this. Introductions still wants current as well (OpenOwner).
 */
import { view, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Listing } = concepts;

export const OwnedOpen = view(
  "the owner of open (listing)",
  ({ listing }, { owner }, _bindings) =>
    where(Listing._get({ listing }).is({ owner, status: "OPEN" })),
).optional();

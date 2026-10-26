# p4 design

how this ended up vs p1, and the one join that was still messy.

## vs p1

Listing / Introducing / Verifying / Expiring are still the same jobs. a few things moved:

- `disclose` is a query (`_disclosed`), not an action. the page can only read through queries.
- Verifying is on the listing, not the person. `examine` became `_evidence`. files are not in the concept.
- `decidedBy` stays after revoke. moving a verified place drops VERIFIED, rent change does not.
- Expiring does not know what a listing is. withdraw on lapse, not mark-let.
- no Photographing concept. photos sit next to Listing the same way proof files sit next to Verifying.
- likes are `localStorage`. not a concept.

current specs: `design/concepts/*.md`. p1 dump is `design/concepts.md`.

## vs p3 visual

same slides. teal on buttons, paprika on errors, oregano VERIFIED, turmeric pending, Newsreader + Source Sans 3. gothic stayed on the board.

## the extra door (this is the p4 change)

multipart cannot go through the json policy. so photos and proof uploads had their own origin / session / owner / OPEN checks. same rules, second copy. that's how you could still swap photos after mark-let.

now there is one view, `OwnedOpen` (`the owner of open (listing)`).

- confirm uses it
- json submit-proof uses it
- multipart photos / proof call `requireOwnedOpen` in `src/access.ts`, which is the same predicate, same origin list as the policy, same public error codes

Introductions still uses `OpenOwner` (open AND current). asking about a lapsed place should fail even before it is withdrawn. confirm / photos / proof only need OPEN.

bytes are not in Verifying. they go in a `files.blobs` collection (and disk if it writes). so a new deploy machine still has the bill. search still cannot see it.

## still separate

concepts do not import each other. they pass identities. contact is not on `_search` / `_get`. evidence is not on public queries.

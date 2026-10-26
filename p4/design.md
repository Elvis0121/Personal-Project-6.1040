# p4 design

in this design ddoc, i'm comparing the changes that I move dthrough across the milestones

how this ended up vs p1, and the one join that was still messy.

## vs p1

Listing / Introducing / Verifying / Expiring are still the same. What changed:

- `disclose` is a query (`_disclosed`), not an action. the page can only read through queries.
- Verifying is on the listing, not the person. `examine` became `_evidence`. files are not in the concept.
- `decidedBy` stays after revoke. moving a verified place drops VERIFIED, rent change does not.
- Expiring does not know what a listing is. withdraw on lapse, not mark-let.
- no Photographing concept. photos sit next to Listing the same way proof files sit next to Verifying.
- likes are `localStorage`. not a concept.

current specs: `[design/concepts/](https://github.com/Elvis0121/Personal-Project-6.1040/tree/412e61d3f92c926dba49e53985c1e0a70be8aa9a/design/concepts)`. vs p3 visual

## p4 change

multipart cannot go through the json policy. so photos and proof uploads had their own origin / session / owner / OPEN checks. same rules, second copy. that's how you could still swap photos after mark-let.

now there is one view, `OwnedOpen` (`the owner of open (listing)`).

- confirm uses it
- json submit-proof uses it
- multipart photos / proof call `requireOwnedOpen` in `src/access.ts`, which is the same predicate, same origin list as the policy, same public error codes

Introductions still uses `OpenOwner` (open AND current). asking about a lapsed place should fail even before it is withdrawn. confirm / photos / proof only need OPEN.

bytes are not in Verifying. they go in a `files.blobs` collection (and disk if it writes). so a new deploy machine still has the bill. search still cannot see it.

## access (what i checked)

session first on anything that writes. Listing's own `NOT_OWNER` for publish / let / edit / withdraw.

`OwnedOpen` (owner + OPEN) is the one join for confirm, submit-proof, and photos. that extra http door was copying those checks and got them wrong after mark-let ([412e61d](https://github.com/Elvis0121/Personal-Project-6.1040/commit/412e61d3f92c926dba49e53985c1e0a70be8aa9a)).

`OpenOwner` still wants current. you should not ask about a lapsed place.

reviewer is a username (`kumba`), not a flag. queue / `_evidence` / proof download all go through that. search never has the bill or the number.

sign out goes to `#/`. guests can still open List a place; the form tells them to log in. `#/review` without an account goes home.


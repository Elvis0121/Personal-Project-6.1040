# Personal-Project-6.1040

 A rental platform for Zimbabwe that takes a tenant from search to tenancy: find a place with its full costs shown up front, connect directly with the landlord, and rent it, without paying middlemen for access along the way.

This is being built as a real product for real tenants and landlords, starting in Harare.

## P1: Design

- [Problem framing](design/problem-framing.md)
- [Pitch](design/pitch.md)
- [Concept specifications](design/concepts.md)
- [UI sketches](design/ui-sketches.md)
- [User journey](design/user-journey.md)

## P2: Alpha (MVP)

- [Core user journey](p2/user-journey.md)
- Concept specs: [Authenticating](design/concepts/Authenticating.md), [Sessioning](design/concepts/Sessioning.md), [Listing](design/concepts/Listing.md), [Introducing](design/concepts/Introducing.md)
- [Application types](design/types.md)
- Compositions: [Sessions](design/compositions/Sessions.md), [Listings](design/compositions/Listings.md), [Introductions](design/compositions/Introductions.md)
- [Demo video](https://youtu.be/vbYU4Ed9J8E)



## P3: Beta

svisual study sldies

- colour: [slide](design/visual-study/01-colour.png) 
- typography: [slide](design/visual-study/02-type.png) 



### Running locally

Needs Bun and Podman.

```sh
bun install
cp .env.example .env
bun run db:up    # MongoDB in Podman; tests and the app both need it
bun run dev      # backend on :3000, frontend on http://127.0.0.1:8080
bun test         # concept, HTTP, and journey tests (throwaway databases)
bun run check    # design, generated files, and types
```

Open the app at exactly [http://127.0.0.1:8080](http://127.0.0.1:8080) (not localhost), so the session cookie works.

### Tests

`bun test` needs MongoDB running (`bun run db:up`). Each file opens a throwaway database, so it does not touch the app's data. Every concept has a test for its principle, plus tests for its refusals. A saved run is in `[tests/bun-test-output.txt](tests/bun-test-output.txt)`.

- The landlord's number never leaks. Search results and listing details never include the contact. `_disclosed` answers it only to the requester of an accepted introduction.
- Only the right person can act. Only a listing's owner can mark it as let, withdraw it, confirm it, edit it, or relist it. Only the landlord who was asked can accept or decline a request. Only `kumba` sees proof and can verify it.
- Duplicate requests are refused. Two simultaneous requests about the same place produce one introduction.
- Relisting gives tenants a fresh chance. Pending and declined requests are cleared, and accepted ones are kept.
- A tenant sees VERIFIED after Kumba checks, and never the evidence. An unverified listing stays in search.
- A listing that is not confirmed in time leaves search and is withdrawn, not marked let.
- Passwords and sessions behave. Passwords are not stored as written. Sessions stop working when they are ended or expire.

`bun run check` confirms that the code matches the specifications in `design/` and that the generated API types are current.

Integration. `tests/journey.test.ts` runs the user journey through the real endpoints, session cookie, and MongoDB: search, VERIFIED, introduction, mark as let, and a lapsed listing leaving search. It also covers access control (no session, a foreign website, acting on someone else's listing or request) and error cases. Write-up (STUB): [p3/user-journey.md](p3/user-journey.md).

Limitations. The Vue pages are not tested automatically; the [demo video](https://youtu.be/vbYU4Ed9J8E) shows them working.

design notebook in private repo
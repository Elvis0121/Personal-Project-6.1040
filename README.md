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



### Running locally

Needs Bun and Podman.

```sh
bun install
cp .env.example .env
bun run dev      # MongoDB, backend on :3000, frontend on http://127.0.0.1:8080
bun test         # concept tests
bun run check    # design, generated files, and types
```

Open the app at exactly [http://127.0.0.1:8080](http://127.0.0.1:8080) (not localhost), so the session cookie works.

### Tests

`bun test` runs each concept against its own throwaway MongoDB database. Every concept has a test for its principle, plus tests for its refusals.

- The landlord's number never leaks. Search results and listing details never include the contact. `_disclosed` answers it only to the requester of an accepted introduction.
- Only the right person can act. Only a listing's owner can mark it as let, withdraw it, or relist it. Only the landlord who was asked can accept or decline a request.
- Duplicate requests are refused. Two simultaneous requests about the same place produce one introduction.
- Relisting gives tenants a fresh chance. Pending and declined requests are cleared, and accepted ones are kept.
- Passwords and sessions behave. Passwords are not stored as written. Sessions stop working when they are ended or expire.

`bun run check` confirms that the code matches the specifications in `design/` and that the generated API types are current.

Limitations**.** These tests cover the concepts on their own. The endpoints and the browser journey were checked by hand, over HTTP and in the browser, but there are no saved integration tests as of et.

design notebook in private repo
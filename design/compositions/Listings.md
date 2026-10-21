# Listings

Advertisers publish places with their full terms, and anyone can search them.
The contact number is stored with the listing, but no search or listing page
ever shows it; Introductions decides when it is released.

## Advertising

A signed-in user [publishes a listing](reaction:Listings.Advertising.Publish).
The owner is the session's account, so nobody can publish on someone else's
behalf. The same account can advertise a place and search for another one.

```endpoints
Listings.Advertising.Publish at /listings/publish
```

Only the owner can [mark a listing as let](reaction:Listings.Advertising.MarkLet)
or [relist it](reaction:Listings.Advertising.Relist): the session's account is
passed to Listing as the owner, and Listing refuses anyone else. Marking a place
as let is the landlord's word alone. Kumba charges landlords for a successful
let, so a landlord has no reason to mark a place as let before it is.

```endpoints
Listings.Advertising.MarkLet at /listings/mark-let
Listings.Advertising.Relist at /listings/relist
```

The owner can [edit an open listing](reaction:Listings.Advertising.Update) or
[withdraw it](reaction:Listings.Advertising.Withdraw). Edit and withdraw use
the same owner check as mark-let. Changing the location of a verified listing
[revokes the verification](reaction:Listings.Advertising.RevokeOnMove): a
cottage in Avondale is not the same claim as one in Belvedere. Changing rent
or extras does not. Relisting does not require proof again.

```endpoints
Listings.Advertising.Update at /listings/update
Listings.Advertising.Withdraw at /listings/withdraw
```

The owner [submits proof](reaction:Listings.Advertising.SubmitProof) about an
open listing they own. The subject is that listing. Empty proof, a second
current proof, someone else's listing, and a listing that is not open are all
refused. Proof is submitted on My listings, not on a separate page.

```endpoints
Listings.Advertising.SubmitProof at /listings/submit-proof
```

[My listings](reaction:Listings.Advertising.Mine) shows the signed-in owner
[their own listings](former:Listings.Advertising.OwnListings), newest first,
with each listing's contact, status, proof status (none, pending, or verified),
whether it is current, and the confirm-by deadline when a timer exists, and the
introduction requests that tenants have made about it. The evidence itself is
not in this former.

```endpoints
Listings.Advertising.Mine at /listings/mine
```

## Searching

[Searching](reaction:Listings.Searching.Search) needs no account, so a tenant
can see what is available before signing up. The
[results](former:Listings.Searching.Results) are the open listings that are
still current in the requested area at or under the maximum rent, cheapest
first, each with its full terms, a VERIFIED flag when Kumba has checked the
advertiser, and none with a contact or with the evidence. A listing whose timer
has lapsed is not in the results, even before it is withdrawn.

```endpoints
Listings.Searching.Search at /listings/search
```

[Viewing a listing](reaction:Listings.Searching.View) answers
[its terms](former:Listings.Searching.Terms) and status, including the owner's
username so the page can tell an owner they are looking at their own place, and
whether the listing is verified and whether it is still current. The evidence
is not in the terms.
An unknown listing answers `NO_SUCH_LISTING`.

```endpoints
Listings.Searching.View at /listings/view
```

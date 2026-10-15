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

[My listings](reaction:Listings.Advertising.Mine) shows the signed-in owner
[their own listings](former:Listings.Advertising.OwnListings), newest first,
with each listing's contact and status, and the introduction requests that
tenants have made about it.

```endpoints
Listings.Advertising.Mine at /listings/mine
```

## Searching

[Searching](reaction:Listings.Searching.Search) needs no account, so a tenant
can see what is available before signing up. The
[results](former:Listings.Searching.Results) are the open listings in the
requested area at or under the maximum rent, cheapest first, each with its full
terms and none with a contact.

```endpoints
Listings.Searching.Search at /listings/search
```

[Viewing a listing](reaction:Listings.Searching.View) answers
[its terms](former:Listings.Searching.Terms) and status, including the owner's
username so the page can tell an owner they are looking at their own place.
An unknown listing answers `NO_SUCH_LISTING`.

```endpoints
Listings.Searching.View at /listings/view
```

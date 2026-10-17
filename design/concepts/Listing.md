# Listing

## Purpose

Let people judge whether a place is worth pursuing by making its full terms
visible while it is available, which prevents having to pay to learn the full
cost.

## Principle

Mrs Dube publishes a cottage in Avondale with its rent, deposit, extra charges,
move-in date, and her contact number. A search for Avondale under US$200 then
answers the cottage with all of its terms but not her number. After she marks it
as let, the same search no longer answers it, and nobody but Mrs Dube can change
it. If the tenant falls through, she relists it and it is open again.

## Types

```types
external User
  The person advertising the place: its owner, or a caretaker acting for the owner.

Status is OPEN or LET or WITHDRAWN
  Whether the place is available, has been let, or was taken down by its advertiser.
```

## State

```state
a set of Listings with
  an owner User
  a location String
  a kind String
  a currency String
  a rent Number
  a deposit Number
  an extras String
  a moveIn Date
  a contact String
  a status Status
```

## Actions

```actions
publish (owner: User, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date, contact: String) : returns (listing: Listing)
  where location, kind, currency, or contact is blank, rent or deposit is not a number, or moveIn is not a calendar date
  then
    refuses INVALID_TERMS "A listing needs a location, a kind of place, a currency, a move-in date, and a contact number."
  where rent or deposit is negative
  then
    refuses NEGATIVE_AMOUNT "Rent and deposit cannot be negative."
  where the terms are accepted
  then
    add a new listing with these terms, owned by owner, with status OPEN
    returns listing

update (owner: User, listing: Listing, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date, contact: String) : returns (listing: Listing)
  where listing is not in Listings
  then
    refuses NO_SUCH_LISTING "There is no such listing."
  where listing's owner is not owner
  then
    refuses NOT_OWNER "Only the advertiser can change this listing."
  where listing's status is not OPEN
  then
    refuses NOT_OPEN "This listing is not open."
  where location, kind, currency, or contact is blank, rent or deposit is not a number, or moveIn is not a calendar date
  then
    refuses INVALID_TERMS "A listing needs a location, a kind of place, a currency, a move-in date, and a contact number."
  where rent or deposit is negative
  then
    refuses NEGATIVE_AMOUNT "Rent and deposit cannot be negative."
  where owner owns the open listing and the terms are accepted
  then
    set the listing's terms to these values
    returns listing

markLet (owner: User, listing: Listing) : returns (listing: Listing)
  where listing is not in Listings
  then
    refuses NO_SUCH_LISTING "There is no such listing."
  where listing's owner is not owner
  then
    refuses NOT_OWNER "Only the advertiser can change this listing."
  where listing's status is not OPEN
  then
    refuses NOT_OPEN "This listing is not open."
  where owner owns the open listing
  then
    set the listing's status to LET
    returns listing

withdraw (owner: User, listing: Listing) : returns (listing: Listing)
  where listing is not in Listings
  then
    refuses NO_SUCH_LISTING "There is no such listing."
  where listing's owner is not owner
  then
    refuses NOT_OWNER "Only the advertiser can change this listing."
  where listing's status is not OPEN
  then
    refuses NOT_OPEN "This listing is not open."
  where owner owns the open listing
  then
    set the listing's status to WITHDRAWN
    returns listing

relist (owner: User, listing: Listing) : returns (listing: Listing)
  where listing is not in Listings
  then
    refuses NO_SUCH_LISTING "There is no such listing."
  where listing's owner is not owner
  then
    refuses NOT_OWNER "Only the advertiser can change this listing."
  where listing's status is OPEN
  then
    refuses ALREADY_OPEN "This listing is already open."
  where owner owns the listing and its status is LET or WITHDRAWN
  then
    set the listing's status to OPEN
    returns listing
```

## Queries

```queries
_search (area: String, maxRent: Number) : many (listing: Listing, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date)
  answers every OPEN listing whose location contains area, ignoring case, and whose rent is at most maxRent
  a blank area matches every location
  a non-text area or a non-number maxRent answers no rows
  answers cheapest first, then in publication order, and never answers a contact
_get (listing: Listing) : optional (owner: User, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date, status: Status)
  answers no row for an unknown listing, and never answers its contact
_byOwner (owner: User) : many (listing: Listing, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date, contact: String, status: Status)
  answers the owner's own listings with their contacts, newest first
  answers no rows for someone who has published nothing
_contact (listing: Listing) : optional (contact: String)
  answers the listing's contact, and no row for an unknown listing
```

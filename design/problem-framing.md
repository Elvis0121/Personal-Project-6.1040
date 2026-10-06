# Problem framing and stakeholders

## Domain

**Renting a home in Zimbabwe, from search to move-in.** This covers all houisng types that people rent: a single room in a shared house, a cottage behind a main house, a flat, or a whole house.

Renting happens in three stages:

1. **Search.** Tenants find advertisements, compare rent and move-in costs, and ask whether the place is still free.
2. **Connect.** Tenants contact whoever is offering the place and arrange a viewing.
3. **Rent.** Tenant and landlord agree on terms, the tenant pays a deposit and first month's rent, and moves in.

Landlords do the other side of each stage. They advertise the vacancy, answer questions, show the place, choose a tenant, and take the advert down once the place is let.

A third party, often called an agent, frequently sits between those two sides. In practice that person may withhold the owner's contact details, or even the listing itself, until a fee is paid. The fee is charged for *access to information*, not for a completed move.

Tenants want a place they can afford without spending the last of their budget on unsuccessful searches. Owners want the vacancy filled without answering the same questions about rooms that are already taken, or about terms that were never written down.

The scarce resource is reliable information about whether a given listing is worth pursuing: whether the price on the flyer is the price you will actually pay, whether the room is still available, and whether the person advertising it is allowed to offer it. Because that information is missing, agents can sell it, and tenants lose money at the search and connect stages, often before they ever reach a landlord.

The pilot product may be based in Harare. It starts as a web app. WhatsApp is how many people already share adverts in Harare, so connecting to it will be a later step, but the design does not depend on it.

## Bad situations

### 1. Paying for terms you should have seen on the advert

A tenant's lease is ending. They find a room advertised at a rent they can pay. The person posting it will not give the owner's number, or even a full breakdown of costs, until a "registration" or "viewing" fee is paid. After paying, the tenant learns there is a deposit, a levy, or a "contribution" that puts the room out of reach. They restart the search with less money for the eventual move. The payment bought a look at information, not housing.

### 2. Paying to chase a room that is already taken

A tenant receives a forwarded WhatsApp advert and contacts the number on it. They pay for an introduction. The room was occupied days ago; the message is still circulating independently of the owner. The tenant has lost money and a day. The owner is still fielding calls about a vacancy that does not exist.

### 3. Paying someone who cannot actually offer the place

A tenant is asked for a viewing fee before they can meet anyone at the property. They have no way to tell whether the owner authorized the advert. If the contact disappears, or the owner says they never listed the room, the tenant is no closer to housing and cannot recover the fee.

These are not "missing search filters." They are losses of money and time caused by **gated, stale, or unauthorized information**. Direct phone numbers on a flyer do not fix them: a number does not mean the room is free, the extras are listed, or the advertiser is the owner.

What makes this easy to miss is that the fee feels like a normal step, not a failure. A registration fee, a viewing fee, or "US$20 for the number" is how a lot of people look for a room, and it only feels wrong after the money is gone. WhatsApp groups and listing sites spread adverts, but they still leave off the three facts the fee is really buying: the full cost, whether the place is still empty, and whether this person can let it. Those facts are cheap to show and expensive to withhold. The market has organized itself around the withholding. Forwarded adverts make the second situation structural rather than rare: a copy keeps circulating after the room is taken, with no owner left to take it down.

## Corroboration

- The *Herald* has reported residents complaining to the Harare Residents Trust that accommodation agents collect fees and disappear without helping people find housing. That supports the pattern in situations 1 and 3; it does not measure how common the pattern is outside Harare. [Agents fleecing home seekers](https://www.heraldonline.co.zw/agents-fleecing-home-seekers/).
- Reporting on bogus estate agents describes fees paid for contacts and viewings, including a case where an owner had not authorized the advert, and adverts for places that did not exist or were already occupied. *[Bogus estate agents](https://www.heraldonline.co.zw/bogus-estate-agents-put-ministers-house-up-for-sale/).*
- A first-person video of moving and renting in Zimbabwe documents agent fees during the search, not only at lease signing. [Moving Out & Renting](https://youtu.be/x66OUUBaSc4?t=480).
- Public discussion on Reddit describes the same gatekeeping: paying agents who control access to listings. This is anecdotal, not a survey. [Tired of dealing with agents](https://www.reddit.com/r/Zimbabwe/comments/1om7v1r/tired_of_dealing_with_the_pack_of_wolves_called/).

Legitimate estate agents exist, and some tenants do find rooms through them. Not every intermediary/agent is fraudulent. However, paying for contact before terms, vacancy, and authorization are visible is a recurring, costly situation, and current channels mix trustworthy and untrustworthy offers in the same stream.

## Workarounds and comparables


| Approach                                                    | What it helps with                                  | Why it does not close the bad situations                                                                                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Friends, relatives, neighbours                              | Trust in the person passing the contact             | Coverage depends on who you know. A trusted friend can still forward a stale advert.                                                                                                      |
| WhatsApp groups and forwarded flyers                        | Cheap, familiar distribution                        | Copies detach from the owner. Terms and vacancy drift. Fees often appear in the next message.                                                                                             |
| Estate agents (licensed or unlicensed)                      | Introductions and viewings                          | Quality varies. Tenants cannot reliably tell a legitimate agent from someone selling access.                                                                                              |
| [NestZim](https://nestzim.com/) (and similar listing sites) | Browse listings; sometimes contact owners or agents | Agents can still list as if the place were theirs. Contact may still be the thing you pay for. Browsing does not by itself show that extras are complete or that the room is still empty. |
| Ohana-style identity and move-in checks                     | Stronger trust in a different housing market        | Built around workflows and connectivity that do not match a Zimbabwe room search, especially for users who live on WhatsApp rather than a housing portal.                                 |

## Solution sketch

A rental platform that replaces the paid middleman with a trusted one, covering all three stages:

- **Search.** Owners publish vacancies with full terms (rent, deposit, every extra charge, move-in date). Tenants search and read those terms for free. Listings expire unless the owner confirms they are still open.
- **Connect.** When listing, the advertiser submits proof that they can offer the place: a rates or electricity bill or title deed in their name, or a letter from the owner authorizing them to let it. A reviewer checks the proof and marks the listing as verified. Unverified listings stay visible but are labeled as such. A tenant requests an introduction, and the advertiser's contact is shared only if they accept.
- **Rent.** Once advertiser and tenant have talked and agreed, the advertiser marks the place as let, and the listing closes. Other tenants stop pursuing a place that is gone. Deposit and rent are paid directly between tenant and landlord, outside the app.

This lets a tenant reject an unaffordable place before spending money, skip places that are already taken, avoid unauthorized adverts, and end with an agreed place to live instead of a phone number.

The product does not need a full marketplace on day one. A single landlord with a few rooms gets value from publishing once and having tenants arrive with the terms already understood.

Tenants never pay to use the service, since charging for access is the problem being solved. Running costs would instead come from landlords, for example a small fee when a listing is successfully let.

## Stakeholders


| Stakeholder                   | Role in the problem                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prospective tenant**        | Pays fees and spends time under uncertainty; needs terms, vacancy, and a legitimate contact without buying access, and wants to end with a place secured.                        |
| **Owner**                     | Has a place to let; is harmed when stale or unauthorized adverts generate junk inquiries, and is the person who can confirm vacancy, consent to contact, and choose a tenant.    |
| **Caretaker**                 | Lets a place on behalf of an owner who lives elsewhere, often abroad. A legitimate advertiser who looks like an unauthorized one unless they can show the owner's authorization. |
| **Access-selling agent**      | Causes the bad situations by charging for introductions and sometimes advertising without authority. Not a user of the app.                                                      |
| **Licensed or trusted agent** | Sometimes a genuine helper. Not a primary user at launch; the app does not try to certify agencies.                                                                              |
| **Reviewer**                  | Not part of the current market failure; introduced in the solution to check each advertiser's proof of ownership or authorization. At launch this willbe a single administrator. |

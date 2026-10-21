# Availability

A listing is searchable only while it is open and current. Thirty days, then
the owner confirms it is still to let, or it is withdrawn. Withdrawn is not
let: the place may still be empty.

## Timers

[Publishing](reaction:Availability.Timers.StartOnPublish) starts a 30-day
timer on the new listing. [Relisting](reaction:Availability.Timers.TimerOnRelist)
starts a timer when none remains, or reschedules the existing one. Marking a
place as let does not delete the timer; relisting then reschedules.

## Confirming

The owner [confirms an open listing is still available](reaction:Availability.Confirming.Confirm).
That renews the timer. Empty proof of ownership is Listing's: someone else's
listing, a missing listing, and a listing that is not open are refused.
Renewing after the deadline is Expiring's `NOT_CURRENT`.

```endpoints
Availability.Confirming.Confirm at /listings/confirm
```

## Lapse

When a timer [expires](reaction:Availability.Lapse.WithdrawOnExpire) and the
listing is still open, it is withdrawn. A let listing is left let. The sweep
that calls expire is not a button: tests move a clock, and the server expires
what `_due` answers.

# Availability

searchable only while its open and current. 30 days, then the owner confirms
its still to let, or it gets withdrawn. withdrawn ≠ let (place might still be
empty).

## Timers

[Publishing](reaction:Availability.Timers.StartOnPublish) starts a 30-day
timer on the new listing. [Relisting](reaction:Availability.Timers.TimerOnRelist)
starts a timer if there isn't one, or reschedules the existing one. mark-let
does not delete the timer; relist reschedules.

## Confirming

The owner [confirms an open listing is still available](reaction:Availability.Confirming.Confirm).
that renews the timer. empty proof of ownership is Listing's: someone else's
listing, missing listing, listing that isn't open. renew after the deadline is
Expiring's `NOT_CURRENT`.

```endpoints
Availability.Confirming.Confirm at /listings/confirm
```

## Lapse

When a timer [expires](reaction:Availability.Lapse.WithdrawOnExpire) and the
listing is still open, it is withdrawn. a let listing stays let. no expire
button — tests move a clock, server expires whatever `_due` answers.

# Strawberry Tracker

The software behind Carter's Red Wagon Farm in Park Rapids, Minnesota. One
Next.js app serving three audiences:

| Area | Route | Who |
| --- | --- | --- |
| Public site | `/` | Customers: hours, today's picking status, season-updates signup |
| Register | `/till` | Staff ringing up cash sales at the farm or a market |
| Admin | `/admin` | Staff and admins: status, products, locations, inventory, field, sales, users |

It runs on Cloudflare Workers via OpenNext, with Postgres (Neon) through Prisma.

## Getting started

```bash
pnpm install                 # also generates the Prisma client
cp .env.example .env         # then fill in DATABASE_URL and an auth provider
pnpm db:deploy               # apply migrations to your database
pnpm dev                     # http://localhost:3000
```

Sign in at `/login`. **While `ADMIN_EMAILS` is empty, any successful sign-in is
allowed in as staff** so you can bootstrap the first account. Set it to your own
address as soon as you have signed in once.

## Layout

```
src/
  app/            Routes only — pages, layouts, and API handlers
    api/          REST endpoints, one folder per resource
    admin/        Staff console (each section gates itself in its layout.tsx)
      field/      The field map, split into its own components
    till/         The cash register
  lib/
    api/          Route-handler building blocks: guards, JSON responses, ranges
    db/           Prisma client factory and the shared `select` shapes
    format/       Money and farm-local date/time formatting
    api-client.ts The browser's typed wrapper around fetch
    auth.ts       NextAuth configuration
    hours.ts      Opening schedule and the customer-facing status
    inventory.ts  Per-location stock changes
    reports.ts    Sale rows -> the admin's aggregated numbers
  types/          Shared domain types and the NextAuth module augmentation
prisma/           Schema and migrations
public/           Images and static assets
```

`@/…` resolves to `src/…`.

## How things fit together

**Authorisation lives in two places, and both are required.** Pages under
`/admin` and `/till` are gated by their `layout.tsx`, which redirects a signed-
out visitor to `/login`. That only controls what renders — every API route
independently calls `requireStaff()` or `requireAdmin()` from
`src/lib/api/guard.ts`, because the routes are reachable directly.

**Money is integer cents everywhere**, from the database through the API to the
browser. It becomes a string only in `src/lib/format/money.ts`. Sale prices are
read from the products server-side when an order is saved, so a tampered payload
can't change what gets recorded.

**A multi-item order is stored as one `Sale` row per product**, tied together by
a shared `groupId`. The cash tendered and change given belong to the order
rather than to any one line, so they are recorded on the first row and zeroed on
the rest — summing either column across a group therefore counts it exactly
once. The till folds the rows back into orders for its shift view.

**"Today" always means today at the farm.** All time-zone handling is in
`src/lib/format/datetime.ts`, which works in `America/Chicago` regardless of
where the code runs. This matters on Workers, where the server clock is UTC and
a naive local midnight would roll the day over six hours early.

**Prisma clients are created per request**, not once per module. On Workers a
database connection is bound to the request that opened it, so a shared client
breaks as soon as a second request reuses it. Neon-over-fetch means there is no
persistent connection to pool, so `getPrisma()` is cheap.

**Inventory is optional per location.** A location with `trackStock` off simply
has no counts; selling and voiding both no-op there. See `src/lib/inventory.ts`.

**The field is a farm, fields, patches, rows.** A row is picked inward from both
ends, so its two percentages can never sum past 100 and what is left over is
what is still worth picking. The map draws rows standing the way they do in the
ground, which only helps if you can tell which one you are in front of, so each
field stores the landmarks at either end of its rows and the map is labelled
with them rather than with a compass direction. There is deliberately no "you
are here" marker: phone GPS lands within a few metres at best and rows sit about
a metre apart, so nothing can place someone to a row, and a hand-set marker goes
stale the moment they walk on.

**Picking is an absolute figure, so a stale save is refused.** A row is
recorded as "now 60% picked from the near end", not as a delta, which means two
people working one patch would otherwise overwrite each other without either
knowing. The board re-reads itself while it is on screen and idle, and on
returning to the tab; and a save states the reading it was built on, so the
server can answer 409 with the row as it actually stands rather than applying
the write. `src/lib/concurrency.ts` holds the rule.

**Row order is data, not creation order.** The map is only worth reading if the
strips run in the same order as the rows do in the ground, and a row added in
July lands at the end of the list wherever it sits in the field. So `sortOrder`
is editable: `POST /api/field/rows/:id/move` (and the patch equivalent) swaps a
sibling one place and renumbers the whole set, so ties and gaps left by earlier
edits cannot survive. `src/lib/order.ts` holds the pure part.

**The field map scales by refusing to shrink.** Row columns share the width
until they would drop under 30px, at which point the map scrolls sideways
instead of turning into strips too thin to hit. Ten rows to a patch is the
normal case and lands around 33px on a phone; past about twelve, the list view
beside it is the better tool. Neither view lets you change a row by touching the
strip: tapping opens a sheet that names the row and needs an explicit save.

**Booking needs no account, and nothing generates the slots.** A reservation is
a name, an email and a party size; the confirmation email carries a token and
that token is the only way back into it. The bookable windows are derived from
the opening schedule staff already keep at `/admin`, so changing the hours
changes what is on offer with nothing to regenerate — a `Slot` row only exists
once someone books it. Neon speaks HTTP, so there is no interactive transaction
to hold a capacity check and an insert together; the booking is written and then
confirmed against the slot's total, and the later of two simultaneous bookings
is stood down rather than the morning being quietly overbooked.

**A booking is moved, not cancelled and rebooked.** Rebooking risked losing the
place in between, which is exactly why someone hesitates to change a time. The
move re-derives the grid, checks the new window has room for the whole party,
and only then reassigns the reservation.

**Capacity is per window where it needs to be.** The default from `/admin`
applies everywhere until a window is given its own, which is what a `Slot` row
is for. The staff screen lists every upcoming window, not just booked ones,
since otherwise a quiet morning could never be sized before it filled.

**Email goes over Resend's HTTP API, not SMTP.** Cloudflare Workers has no raw
TCP sockets, so nodemailer cannot work here. See `src/lib/mailer.ts`; with no
key configured, sending is skipped and the booking still stands.

## Working on it

```bash
pnpm check          # lint, typecheck and test
pnpm test           # vitest, once
pnpm test:watch     # vitest, watching
pnpm db:migrate     # create a migration after editing prisma/schema.prisma
pnpm db:studio      # browse the data
```

Tests cover the pure logic that is easy to get quietly wrong and expensive to
get wrong: money formatting and change-making, farm-local dates across the
daylight-saving boundary, the opening-hours status rules, and the sales
aggregation. They live beside the code they test, as `*.test.ts`.

When you change a model's shape, update the `select` in `src/lib/db/select.ts`
and its counterpart in `src/types/domain.ts` together — the API and the browser
read the same fields from opposite ends.

## Deploying

```bash
pnpm preview        # build and run the Workers bundle locally
pnpm deploy         # build and ship to Cloudflare
```

Secrets go in `.dev.vars` locally and in Cloudflare's dashboard (or
`wrangler secret put`) for the deployed worker. Run `pnpm db:deploy` against the
production database when a release includes migrations.

# Larder — coins & aquarium (gamification v2)

Companion to `PROJECT.md` §5 (gamification rules) and `ARCHITECTURE.md` (infra). This adds a spendable currency and a collectible fish tank on top of the existing points/streak/badges system — themed around your wife's field, since "buy fish with coins earned by cooking" is a much better fit for her than generic gem icons would be.

---

## 1. Does the database design need to change for this? — No.

Short answer: the Phase 1 data design in `ARCHITECTURE.md` (single JSON blob in D1, shaped like `emptyState()`) absorbs this without any schema change. Concretely:

- The existing `game` object already exists in the blob (`{ points, freshStreak, lastAudit, badges }`). This feature is just **two new keys on that same object** — `coins` (a number) and `aquarium` (an array of owned fish). No new table, no migration, no new endpoint: the existing `PUT /api/state` already round-trips the whole blob, so it round-trips these too.
- The fish species themselves (name, tier, cost, fun fact, icon) are **not user data** — they're a fixed catalog, exactly like the ~80-item ingredient `CATALOG` already baked into `Larder.jsx`. That belongs as a JS constant shipped in the frontend bundle, not a database table. Only "which ones do we own" needs to persist, and that's a tiny array of IDs.

This is small enough that it would be a mistake to build a `fish_species` table, a `shop_transactions` table, etc. — that's solving for a scale (hundreds of species, admin-editable catalog, per-user economies) this app doesn't have. The blob design was specifically meant to keep small additions like this cheap; this is that working as intended.

**When it would stop being enough:** if you ever want the catalog itself editable from a UI (not a code change) rather than a fixed list, or want server-side reporting across purchases — neither is on the table here. If that day comes, it's a `fish_catalog` table plus turning `aquarium` from an ID array into a proper `owned_fish` join table. Not now.

### What actually changes in the state shape

```js
game: {
  points: 0,          // unchanged — lifetime score, drives streak & badges, never spent
  freshStreak: 0,      // unchanged
  lastAudit: null,     // unchanged
  badges: [],          // unchanged
  coins: 0,             // NEW — spendable balance
  aquarium: []          // NEW — [{ speciesId, acquiredAt, via: "shop" | "rescue" }]
}
```

`points` and `coins` are deliberately two different numbers. Points stay lifetime-only (so streaks/badges never go backwards just because you spent coins); coins are the wallet you spend at the shop. Same events fund both — see §2.

---

## 2. Economy

Coins are earned by the same real behaviors already in `PROJECT.md` §5 — this isn't a new grind, it's the existing point events also paying out coins:

| Event | Points (unchanged) | Coins (new) |
|---|---|---|
| Mark a meal cooked | +10 | +10 |
| ...used an ingredient ≤2 days from expiry ("rescue") | +15 each | +15 each, **and** a guaranteed bonus fish (see below) |
| Put away a shopping run | +20 | +20 |

**Rescue events give a fish directly, not just coins.** Using up something that was about to go bad is the one behavior most worth making feel special, and it's the most natural fit for a marine-conservation theme — "rescuing" food from waste mirrors what her field is actually about. A rescue always grants a coin bonus and *sometimes* an immediate fish (weighted toward common/uncommon so it doesn't trivialize the shop), independent of what's purchasable. This is a nice, low-effort way to make the theme feel intentional rather than decorative.

**Pacing check**, so the shop doesn't feel like a slot machine or a slog: cooking dinner most nights + a weekly shopping run realistically earns ~100–150 coins/week. At the costs below, a common fish is achievable in under a week, and completing the whole legendary tier is a multi-week goal — long enough to matter, not so long it feels pointless.

---

## 3. Starter catalog (8 species, 4 tiers)

A first pass — swap species, facts, or costs freely; this is meant to be edited, not prescriptive. Real species and real one-line facts throughout, since a made-up "fact" would undercut the whole point of using her field as the theme.

| Tier | Cost | Species | Fact shown in-app |
|---|---|---|---|
| Common | 30 | Clownfish | All clownfish are born male — the dominant one in a group becomes female. |
| Common | 30 | Sergeant Major | Named for its black bars, which resemble a sergeant's rank stripes. |
| Uncommon | 90 | Blue Tang | Can shift the intensity of its blue coloring with mood and stress. |
| Uncommon | 90 | Lionfish | Venomous spines are for defense, not hunting. |
| Rare | 220 | Mandarinfish | One of the few animals whose blue color is true pigment, not structural color. |
| Rare | 220 | Seahorse | Males carry and give birth to the babies, not females. |
| Legendary | 500 | Anglerfish | Its glow comes from bioluminescent bacteria living on the lure. |
| Legendary | 500 | Mola mola (ocean sunfish) | The heaviest bony fish alive — a female can carry 300 million eggs. |

Collecting is unique-per-species (buying one you already own isn't offered again) — matches the existing badge philosophy in `PROJECT.md` §5 ("binary, named after real behavior"). Completing a tier is a natural badge: *"Reef Complete"* for all commons, and so on up to *"Legendary Tank"* for all eight.

Nice optional touch for later, not needed to ship: let your wife pick/edit the real catalog and facts herself — turns the aquarium into an actual small field guide rather than generic game dressing.

---

## 4. Asset draft

Delivered: a first pass of the icon set — one coin + 8 fish, flat 2–4 color SVG, 64×64 viewBox, each file under 1KB. Small on purpose: crisp at the ~24–56px sizes they'd actually show at (wallet chip, shop grid, tank view), and cheap enough that shipping all 9 costs nothing in load time.

Preview: `gamification-assets-preview.html` (renders the whole set in a mock shop screen, dark ocean palette).
Individual files: `assets/coin.svg`, `assets/fish-clownfish.svg`, `assets/fish-sergeant-major.svg`, `assets/fish-blue-tang.svg`, `assets/fish-lionfish.svg`, `assets/fish-mandarinfish.svg`, `assets/fish-seahorse.svg`, `assets/fish-anglerfish.svg`, `assets/fish-mola-mola.svg` — usable as-is as React/`<img>` assets once the app is built, or as a base to refine.

This is a first pass for direction, not final art — flag anything (palette, style, which species) you'd want changed and I'll redo it before it's treated as final.

---

## 5. Open items

1. Does the coin-earning table above (10/15/20, matching existing points 1:1) feel right, or should coins be scaled differently from points so the shop takes longer/shorter to progress through?
2. Rescue-triggered bonus fish — fine as "sometimes," or should it be guaranteed every time to make the rescue behavior always feel rewarded?
3. Worth asking your wife to weigh in on the species list / facts before this is built, or is the placeholder set fine to ship with?

---

## 6. Ocean floor scene — fish placement, coral growth, waste dirtiness

The aquarium isn't just a shop list — bought fish live on a persistent ocean-floor scene: a round coral centerpiece that grows as the collection grows, and a "how messy is the tank" signal tied to food actually wasted that month. **Built** — see `src/aquarium/OceanFloor.jsx`, `coral.js`, and `fishCatalog.js` in the app repo. (The original standalone mockup, `ocean-floor-prototype.html`, was a design draft only and isn't part of the app — the real, state-wired version lives in `src/aquarium/`.)

**Coral growth — discrete stages, not a slow creep.** Tied to total fish owned:

| Fish owned | Coral stage |
|---|---|
| 0–1 | Bud — a single small dome |
| 2–4 | Small — dome + one lobe |
| 5–7 | Growing — full lobed mound + a branch |
| 8 / 8 (full collection) | Full bloom — every lobe, two branches, a soft glow + sparkle accents |

Discrete on purpose, same reasoning as the badge system in `PROJECT.md` §5: a coral that visibly *jumps* to a new, denser shape each time you cross a threshold reads as a milestone worth noticing. A coral that grows by 3% per fish would be invisible day to day and give up all the payoff.

**Waste dirtiness — a new tracked number, still no schema change.** This needs one new thing the app doesn't track yet: how many items get thrown out (past-date) in the current calendar month. Add it right alongside `coins`/`aquarium` on the same `game` object:

```js
game: {
  ...
  wasteThisMonth: 0,        // NEW — count of items marked past-date this month, resets on month rollover
  wasteLog: {}               // NEW, optional — { "2026-08": 3, "2026-07": 0, ... } if you want a history/trend view later
}
```

Still just keys on the existing blob — no table, no migration. Increment `wasteThisMonth` wherever the app already detects an item going past-date (the same check `freshStreak` uses); reset it to 0 on the first open of a new month, optionally archiving the prior month's count into `wasteLog` first.

Visual mapping (0–5+ scale): water tint shifts from clear blue toward a murky green-brown overlay, a few strands of algae sway near the floor, and small debris shapes (bottle, wrapper, can) appear on the sand — more of each as the month's waste count climbs.

**Important, and worth being deliberate about:** `PROJECT.md` §5 explicitly rules out decay/punishment mechanics for the streak system ("a missed week should never erase a streak"). A dirty tank is visual, not destructive — it never removes fish, never touches coins or points or the streak itself, and it fully clears the moment a new month starts clean. Treat it as a mirror ("the tank needs a clean") rather than a penalty, and it stays consistent with that existing rule instead of quietly contradicting it.

**Fish movement — yes, 2D swimming is easy and cheap.** No canvas, no game engine, no meaningful performance cost: each fish is one absolutely-positioned element, animated with a CSS `transform: translateX` loop (drifts across the tank, direction/speed/vertical lane varied per fish so they don't move in lockstep) plus a small independent vertical bob. Legendary fish (anglerfish, mola mola) move slower and larger for a sense of weight, common fish flit faster and smaller. Total added weight: a few KB of CSS/JS, nothing else.

Still a first pass on composition and art, not final — the coral shape, color balance, and algae/debris density are all easy to tune in `src/aquarium/` once you've used it for a bit. See the README's "Editing the art" section for exactly where to make changes.

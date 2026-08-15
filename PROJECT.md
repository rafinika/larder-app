# Larder — project doc

Kitchen inventory, meal plan, and shopping list for a two-person household.
This file is the source of truth. When a decision here and the code disagree, the code is probably stale — update this doc when you change direction, not after.

Current build: a real deployable app — Vite + React frontend, Cloudflare Worker + D1 backend, PIN login. See `ARCHITECTURE.md` for the design and `README.md` in the repo root for how to run/deploy it. (The original single-file artifact this was ported from is preserved in git history.)

---

## 1. Core idea

One pipeline, viewed from either end:

```
shopping list → checked off → inventory (fridge/pantry) → consumed by a meal → gone
```

Meal-plan-first and shop-first are the same pipeline run in opposite directions. Model the pipeline once; both directions fall out of it.

Non-negotiable constraints that shape every feature below:
- **Loose quantities only** — `plenty / low / out`, never grams. This is why the app is buildable at all; don't reintroduce precise quantities.
- **No typed dates** — expiry is computed from a per-ingredient shelf-life default at purchase time, editable but never required.
- **Household of two, co-op not competitive** — one shared score, not a leaderboard between partners.

---

## 2. MVP scope — what "done" means

The MVP is done when a real household can run one full week without hitting a wall:

- [x] Add items to a shopping list (typed, from fridge nudges, or pulled from the week's plan)
- [x] Check items off → they land in inventory with a location and auto-computed expiry
- [x] View inventory grouped by location, sorted by soonest expiry
- [x] Cycle an item plenty → low → out with one tap
- [x] "Running low" items surface back onto the shopping list
- [x] Plan a week via LLM, seeded by what's expiring soonest in the kitchen
- [x] Add a single meal by name via LLM (reverse direction), or repeat a past meal
- [x] Mark a meal cooked → decrement/mark-out the ingredients it used, one tap per ingredient
- [x] Weekly nutrition/variety summary (plants, protein sources, rough kcal/protein) — estimates only, no logging
- [x] Points + streak + badges tied to real behavior (cooking, not wasting, rescuing near-expiry food)
- [x] Data persists across sessions and devices (Cloudflare D1, via the Worker API — see `ARCHITECTURE.md`)

**Not MVP — deliberately deferred** (see §6):
- ~~Multi-device sync between the two people~~ — now built, see `ARCHITECTURE.md`
- Lunches / breakfasts (dinner-only for now)
- Editing shelf-life defaults per-household from the UI
- Recipe steps / instructions (app tracks *what*, not *how* to cook it)
- Barcode scanning or receipt import

If a feature request doesn't serve the checklist above, it's post-MVP — note it in §6, don't build it yet.

---

## 3. Data model

```
Ingredient (catalog, ~80 seeded + user-added "custom" ones)
  id, name, aisle, loc (fridge|freezer|pantry),
  life (default shelf-life in days), plant (bool), protein (poultry|red|fish|egg|legume|dairy|null)

InventoryItem
  id, ingredientId, location, state (plenty|low|out),
  purchasedAt, expiresAt, updatedAt

ShoppingListRow
  id, ingredientId, note (free-text qty, e.g. "~400g"), checked

Meal
  id, name, cuisine, ingredients[{ingredientId, note, essential}],
  kcal, protein (per serving, LLM estimate), why (short reason it was suggested)

WeekPlan (keyed by ISO date of the Monday)
  { [dayIndex 0-6]: { mealId, cooked, cookedAt } }

Game
  points, freshStreak, badges[]
```

Design rules baked into this:
- Every record has a stable `id` (uuid-ish) and, where mutated, an `updatedAt` — so sync later is a merge, not a rewrite.
- `Meal.ingredients[].note` is free text, never parsed. Recipe quantities are for humans, not the state machine.
- `essential: false` ingredients don't block a meal from being "cookable now."

---

## 4. Nutrition — what's exact vs. estimated

| Shown | Source | Trust level |
|---|---|---|
| Distinct plants this week | Counted in code from `ingredient.plant` | Exact |
| Protein sources this week | Counted in code from `ingredient.protein` | Exact |
| kcal / protein per serving | LLM estimate at plan time, cached on the `Meal` | Rough — labeled as such in-app |

Decision: **never let the LLM be the only source for a number the UI presents as fact.** Variety metrics are deterministic; calorie/protein figures always carry the "estimate" disclaimer and are never summed into a daily "budget" — that turns the app into a diet tracker, which is explicitly not the goal.

If a future version wants real macro accuracy, the move is: LLM maps free-text ingredient → canonical food id, a real nutrition database (e.g. USDA FoodData Central) supplies the numbers. Don't ship LLM-invented macros as ground truth.

---

## 5. Gamification rules

Only reward things that serve the app's actual purpose (less waste, more cooking, more variety). Point values live in code (`CookSheet`, `putAway`) — this table is the intent behind them:

| Event | Points | Why |
|---|---|---|
| Mark a meal cooked | +10 | Base encouragement |
| ...and it used an ingredient ≤2 days from expiry | +15 each | The "rescue bonus" — turns urgency into a reward, not a chore |
| Put away a shopping run | +20 | Closes the loop back into inventory |

Streak = consecutive weeks with zero items tossed past-date. Badges are binary and named after real behavior ("Four proteins in a week"), not vague levels. No decay/punishment mechanics — a missed week should never erase a streak in a way that discourages opening the app again.

Two-person households: score is shared, not per-person. If per-person tracking gets added later, keep it descriptive ("who cooked more this week") not competitive.

**v2 addition — coins + aquarium:** see `GAMIFICATION.md` for the full design. Same trigger events also pay out a spendable `coins` balance (separate from lifetime `points`), spent on a small fixed catalog of real fish species — a nod to marine biology rather than generic gem/coin icons. No schema change needed; it's two new keys on the existing `game` object in the state blob.

---

## 6. Deferred / not yet decided

Things raised but intentionally not built into the MVP — revisit here, don't silently reintroduce them into code without updating this doc:

- ~~**Sync between two phones.**~~ Built — see `ARCHITECTURE.md`. Cloudflare Worker + D1, single JSON blob plus a `version` column for optimistic-concurrency writes, gated behind a PIN with remembered devices (not the originally-considered "no login" — see `ARCHITECTURE.md` §7 for why that changed).
- **Editable shelf-life defaults.** Right now all 80 catalog shelf-lives are hardcoded guesses. Fine for MVP; a real household will eventually want to correct "eggs = 21 days" to match their own fridge.
- **Lunch/breakfast rows.** Week view is dinner-only. Adding rows is mechanical but changes the nutrition summary's meaning (per-dinner vs. per-day) — needs a decision on how to display that before building.
- **Single-day regeneration.** "Swap just Thursday" — currently you clear a day and re-add manually. Small win, not yet built.
- **"Cook now" mode.** A dedicated "what can I make with exactly what's in the fridge right now" view, separate from the weekly plan. Overlaps with `AddMealSheet`'s repeat list but isn't a first-class flow yet.

---

## 7. Open questions for the next session

Answer these before extending, don't guess:
1. ~~Does sync mean...~~ Answered — see `ARCHITECTURE.md`: real backend (Cloudflare Worker + D1), not a shared storage key.
2. Should lunches share the dinner catalog and gamification, or be tracked separately and lighter-weight?
3. Is there a real appetite for correcting shelf-life defaults, or is "close enough" fine indefinitely?

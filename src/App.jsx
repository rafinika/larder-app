import React, { useState, useEffect, useMemo, useRef } from "react";
import { getState, putState, askClaude as apiAskClaude } from "./api.js";
import PinGate from "./components/PinGate.jsx";
import { CoinIcon } from "./components/icons.jsx";
import AquariumView from "./aquarium/AquariumView.jsx";
import { rollRescueFish } from "./aquarium/fishCatalog.js";

/* ============================================================
   LARDER — kitchen inventory, meal plan, shopping list
   for a two-person household
   ============================================================ */

const C = (id, name, aisle, loc, life, plant, protein) => ({ id, name, aisle, loc, life, plant, protein });

const CATALOG = [
  // Produce
  C("spinach","Spinach","Produce","fridge",4,true,null),
  C("kale","Kale","Produce","fridge",5,true,null),
  C("bok_choy","Bok choy","Produce","fridge",4,true,null),
  C("cabbage","Cabbage","Produce","fridge",14,true,null),
  C("carrot","Carrot","Produce","fridge",21,true,null),
  C("potato","Potato","Produce","pantry",30,true,null),
  C("sweet_potato","Sweet potato","Produce","pantry",21,true,null),
  C("onion","Onion","Produce","pantry",30,true,null),
  C("shallot","Shallot","Produce","pantry",30,true,null),
  C("garlic","Garlic","Produce","pantry",60,true,null),
  C("ginger","Ginger","Produce","fridge",21,true,null),
  C("tomato","Tomato","Produce","fridge",7,true,null),
  C("cucumber","Cucumber","Produce","fridge",7,true,null),
  C("bell_pepper","Bell pepper","Produce","fridge",10,true,null),
  C("chili","Chili","Produce","fridge",10,true,null),
  C("broccoli","Broccoli","Produce","fridge",6,true,null),
  C("green_beans","Green beans","Produce","fridge",6,true,null),
  C("mushroom","Mushroom","Produce","fridge",5,true,null),
  C("lettuce","Lettuce","Produce","fridge",5,true,null),
  C("zucchini","Zucchini","Produce","fridge",7,true,null),
  C("eggplant","Eggplant","Produce","fridge",6,true,null),
  C("bean_sprouts","Bean sprouts","Produce","fridge",2,true,null),
  C("spring_onion","Spring onion","Produce","fridge",7,true,null),
  C("cilantro","Cilantro","Produce","fridge",5,true,null),
  C("basil","Basil","Produce","fridge",4,true,null),
  C("lemongrass","Lemongrass","Produce","fridge",14,true,null),
  C("lime","Lime","Produce","fridge",14,true,null),
  C("lemon","Lemon","Produce","fridge",14,true,null),
  C("banana","Banana","Produce","pantry",5,true,null),
  C("apple","Apple","Produce","fridge",21,true,null),
  C("orange","Orange","Produce","fridge",14,true,null),
  C("avocado","Avocado","Produce","fridge",4,true,null),
  C("corn","Corn","Produce","fridge",5,true,null),
  // Meat & Fish
  C("chicken_thigh","Chicken thigh","Meat & Fish","fridge",2,false,"poultry"),
  C("chicken_breast","Chicken breast","Meat & Fish","fridge",2,false,"poultry"),
  C("ground_beef","Ground beef","Meat & Fish","fridge",2,false,"red"),
  C("beef_chuck","Beef chuck","Meat & Fish","fridge",3,false,"red"),
  C("pork_belly","Pork belly","Meat & Fish","fridge",3,false,"red"),
  C("salmon","Salmon","Meat & Fish","fridge",2,false,"fish"),
  C("white_fish","White fish","Meat & Fish","fridge",2,false,"fish"),
  C("shrimp","Shrimp","Meat & Fish","fridge",2,false,"fish"),
  C("canned_tuna","Canned tuna","Meat & Fish","pantry",365,false,"fish"),
  C("sardines","Sardines","Meat & Fish","pantry",365,false,"fish"),
  // Dairy & Eggs
  C("eggs","Eggs","Dairy & Eggs","fridge",21,false,"egg"),
  C("milk","Milk","Dairy & Eggs","fridge",7,false,"dairy"),
  C("yogurt","Yogurt","Dairy & Eggs","fridge",14,false,"dairy"),
  C("butter","Butter","Dairy & Eggs","fridge",30,false,"dairy"),
  C("cheddar","Cheddar","Dairy & Eggs","fridge",21,false,"dairy"),
  C("cream","Cream","Dairy & Eggs","fridge",7,false,"dairy"),
  C("tofu","Tofu","Dairy & Eggs","fridge",5,true,"legume"),
  C("tempeh","Tempeh","Dairy & Eggs","fridge",5,true,"legume"),
  // Dry Goods
  C("rice","Rice","Dry Goods","pantry",365,false,null),
  C("pasta","Pasta","Dry Goods","pantry",365,false,null),
  C("noodles","Noodles","Dry Goods","pantry",365,false,null),
  C("bread","Bread","Dry Goods","pantry",5,false,null),
  C("flour","Flour","Dry Goods","pantry",180,false,null),
  C("oats","Oats","Dry Goods","pantry",180,true,null),
  C("quinoa","Quinoa","Dry Goods","pantry",365,true,null),
  C("lentils","Lentils","Dry Goods","pantry",365,true,"legume"),
  C("chickpeas","Chickpeas","Dry Goods","pantry",365,true,"legume"),
  C("black_beans","Black beans","Dry Goods","pantry",365,true,"legume"),
  C("peanuts","Peanuts","Dry Goods","pantry",180,true,"legume"),
  C("cashews","Cashews","Dry Goods","pantry",180,true,null),
  // Spices & Sauces
  C("soy_sauce","Soy sauce","Spices & Sauces","pantry",365,false,null),
  C("fish_sauce","Fish sauce","Spices & Sauces","pantry",365,false,null),
  C("oyster_sauce","Oyster sauce","Spices & Sauces","fridge",180,false,null),
  C("olive_oil","Olive oil","Spices & Sauces","pantry",365,false,null),
  C("coconut_milk","Coconut milk","Spices & Sauces","pantry",365,false,null),
  C("curry_paste","Curry paste","Spices & Sauces","fridge",60,false,null),
  C("sambal","Sambal","Spices & Sauces","fridge",90,false,null),
  C("vinegar","Vinegar","Spices & Sauces","pantry",365,false,null),
  C("honey","Honey","Spices & Sauces","pantry",365,false,null),
  C("tomato_paste","Tomato paste","Spices & Sauces","fridge",30,true,null),
  C("cumin","Cumin","Spices & Sauces","pantry",365,false,null),
  C("turmeric","Turmeric","Spices & Sauces","pantry",365,false,null),
  C("coriander_seed","Coriander","Spices & Sauces","pantry",365,false,null),
  C("paprika","Paprika","Spices & Sauces","pantry",365,false,null),
  C("salt","Salt","Spices & Sauces","pantry",365,false,null),
  C("pepper","Black pepper","Spices & Sauces","pantry",365,false,null),
  // Frozen
  C("frozen_peas","Frozen peas","Frozen","freezer",180,true,null),
  C("frozen_corn","Frozen corn","Frozen","freezer",180,true,null),
];

const AISLES = ["Produce","Meat & Fish","Dairy & Eggs","Dry Goods","Spices & Sauces","Frozen"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const KEY = "larder:state:v1";
const PROTEIN_LABEL = { poultry:"Poultry", red:"Red meat", fish:"Fish", egg:"Eggs", legume:"Legumes", dairy:"Dairy" };

/* ---------- helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = (d) => d.toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

function weekStart(date = today()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -day);
}

function freshness(item) {
  if (item.state === "out") return { key: "out", label: "Out", days: null };
  const left = daysBetween(today(), item.expiresAt);
  if (left < 0) return { key: "gone", label: "Past date", days: left };
  if (left === 0) return { key: "gone", label: "Today", days: 0 };
  if (left <= 2) return { key: "soon", label: `${left}d left`, days: left };
  return { key: "fresh", label: `${left}d left`, days: left };
}

function byId(id) { return CATALOG.find(c => c.id === id); }

function ingName(state, id) {
  return byId(id)?.name || state.custom?.[id]?.name || id;
}
function ingMeta(state, id) {
  return byId(id) || state.custom?.[id] || { id, name: id, aisle: "Dry Goods", loc: "pantry", life: 14, plant: false, protein: null };
}

const emptyState = () => ({
  version: 1,
  custom: {},
  inventory: [],
  list: [],
  meals: {},
  plan: {},
  cookedLog: [],
  game: {
    points: 0, freshStreak: 0, lastAudit: null, badges: [],
    coins: 0, aquarium: [],                 // coin economy + owned fish — GAMIFICATION.md §1
    wasteThisMonth: 0, wasteMonth: null, wasteLog: {},  // ocean-floor dirtiness — GAMIFICATION.md §6
  },
  prefs: { people: 2, avoid: "", cuisines: "" },
});

/* ---------- Claude API ----------
   Same contract as before (prompt in, parsed JSON out) — the actual Anthropic
   call now happens server-side in the Worker (worker/index.js), which is the
   only place that holds the API key. See ARCHITECTURE.md §4. */
const askClaude = apiAskClaude;

const catalogLines = () => CATALOG.map(c => `${c.id}|${c.name}`).join("\n");

/* ============================================================
   APP
   ============================================================ */
function LarderApp() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("week");
  const [toast, setToast] = useState(null);
  const saveTimer = useRef(null);
  const versionRef = useRef(1);

  // Load from the Worker/D1 instead of window.storage — this is what makes both
  // phones see the same data. See ARCHITECTURE.md §5.
  useEffect(() => {
    (async () => {
      try {
        const r = await getState();
        versionRef.current = r.version;
        setState({ ...emptyState(), ...r.state, game: { ...emptyState().game, ...r.state.game } });
      } catch (e) {
        console.error("getState failed:", e);
        setState(emptyState());
      }
    })();
  }, []);

  // Debounced save with optimistic-concurrency conflict handling: if another
  // device wrote since we last read, adopt its state instead of clobbering it.
  useEffect(() => {
    if (!state) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await putState(state, versionRef.current);
        if (r.conflict) {
          versionRef.current = r.version;
          setState({ ...emptyState(), ...r.state, game: { ...emptyState().game, ...r.state.game } });
          flash("Updated on another device — refreshed.");
        } else {
          versionRef.current = r.version;
        }
      } catch (e) {
        console.error("putState failed:", e);
      }
    }, 400);
  }, [state]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const award = (n, msg) => {
    // Coins mirror points 1:1 — same trigger events fund both. See GAMIFICATION.md §2.
    setState(s => ({ ...s, game: { ...s.game, points: s.game.points + n, coins: s.game.coins + n } }));
    if (msg) flash(`${msg}  +${n}`);
  };

  if (!state) return <Boot />;

  const wk = iso(weekStart());
  const plan = state.plan[wk] || {};

  return (
    <div className="app">
      <Styles />
      <header className="top">
        <div className="brand">
          <span className="mark" />
          <h1>Larder</h1>
        </div>
        <div className="score">
          <span className="pts">{state.game.points}</span>
          <span className="ptslabel">pts</span>
          <span className="coinschip"><CoinIcon size={15} />{state.game.coins}</span>
        </div>
      </header>

      <main className="body">
        {tab === "week" && <WeekView state={state} setState={setState} wk={wk} plan={plan} award={award} flash={flash} />}
        {tab === "fridge" && <FridgeView state={state} setState={setState} flash={flash} />}
        {tab === "list" && <ListView state={state} setState={setState} award={award} flash={flash} />}
        {tab === "tank" && <AquariumView state={state} setState={setState} flash={flash} />}
        {tab === "progress" && <ProgressView state={state} setState={setState} wk={wk} plan={plan} flash={flash} />}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabs">
        {[["week","Week"],["fridge","Fridge"],["list","List"],["tank","Tank"],["progress","Progress"]].map(([k, label]) => (
          <button key={k} className={tab === k ? "tab on" : "tab"} onClick={() => setTab(k)}>
            <TabIcon k={k} on={tab === k} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Boot() {
  return <div className="boot"><Styles /><span className="mark" /><p>Opening the larder…</p></div>;
}

/* ============================================================
   WEEK
   ============================================================ */
function WeekView({ state, setState, wk, plan, award, flash }) {
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null); // {day} | {cook:day}
  const start = weekStart();

  const expiring = state.inventory
    .filter(i => i.state !== "out")
    .map(i => ({ ...i, f: freshness(i) }))
    .filter(i => i.f.days !== null && i.f.days <= 3)
    .sort((a, b) => a.f.days - b.f.days);

  const haveList = state.inventory.filter(i => i.state !== "out");

  async function planWeek() {
    setBusy(true);
    try {
      const have = haveList.map(i => {
        const f = freshness(i);
        return `${ingName(state, i.ingredientId)} (${f.days <= 3 ? `expires in ${Math.max(f.days,0)}d` : "fine"})`;
      }).join(", ") || "nothing yet";

      const prompt = `You plan dinners for a household of ${state.prefs.people}.

INGREDIENT CATALOG (use these ids only):
${catalogLines()}

CURRENTLY IN THE KITCHEN: ${have}
${state.prefs.avoid ? `AVOID: ${state.prefs.avoid}` : ""}
${state.prefs.cuisines ? `PREFERRED CUISINES: ${state.prefs.cuisines}` : ""}

Plan 7 dinners for one week. Rules:
- Prioritise ingredients expiring soonest in the EARLIEST days.
- Vary the protein across the week (fish, legumes, poultry, red meat, eggs).
- Include plenty of distinct vegetables across the week.
- Keep it realistic home cooking, not restaurant food.

Reply with JSON ONLY, no prose:
{"meals":[{"n":"meal name","c":"cuisine","ing":[{"id":"catalog_id","q":"~400g","e":1}],"new":[{"n":"ingredient name","a":"Produce","q":"2 stalks","e":1}],"kcal":520,"pro":38,"why":"one short reason"}]}
"e" is 1 if essential, 0 if optional. "kcal" and "pro" are per serving. Use "new" only for ingredients genuinely not in the catalog. Exactly 7 meals.`;

      const out = await askClaude(prompt, 4000);
      if (!Array.isArray(out.meals) || out.meals.length === 0) throw new Error("No meals in response.");
      applyMeals(out.meals, true);
      flash("Week planned. Swap anything you don't like.");
    } catch (e) {
      console.error("planWeek failed:", e);
      flash(`Couldn't plan the week — ${e.message || "try again"}`);
    }
    setBusy(false);
  }

  function applyMeals(meals, assignDays) {
    setState(s => {
      const custom = { ...s.custom };
      const mealsMap = { ...s.meals };
      const planWk = { ...(s.plan[wk] || {}) };

      meals.forEach((m, idx) => {
        const ings = [];
        (m.ing || []).forEach(x => {
          if (byId(x.id) || custom[x.id]) ings.push({ ingredientId: x.id, note: x.q || "", essential: x.e !== 0 });
        });
        (m.new || []).forEach(x => {
          const id = "x_" + x.n.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          if (!custom[id]) {
            custom[id] = { id, name: x.n, aisle: AISLES.includes(x.a) ? x.a : "Dry Goods", loc: x.a === "Produce" ? "fridge" : "pantry", life: x.a === "Produce" ? 7 : 90, plant: x.a === "Produce", protein: null };
          }
          ings.push({ ingredientId: id, note: x.q || "", essential: x.e !== 0 });
        });
        const id = uid();
        mealsMap[id] = { id, name: m.n, cuisine: m.c || "", ingredients: ings, kcal: m.kcal || null, protein: m.pro || null, why: m.why || "" };
        if (assignDays && idx < 7) planWk[idx] = { mealId: id, cooked: false };
      });

      return { ...s, custom, meals: mealsMap, plan: { ...s.plan, [wk]: planWk } };
    });
  }

  function clearDay(d) {
    setState(s => {
      const p = { ...(s.plan[wk] || {}) };
      delete p[d];
      return { ...s, plan: { ...s.plan, [wk]: p } };
    });
  }

  return (
    <div className="view">
      {expiring.length > 0 && (
        <div className="urgent">
          <p className="urgent-h">Cook these first</p>
          <div className="chips">
            {expiring.slice(0, 6).map(i => (
              <span key={i.id} className={`chip ${i.f.key}`}>{ingName(state, i.ingredientId)} · {i.f.label}</span>
            ))}
          </div>
        </div>
      )}

      <div className="sectionhead">
        <h2>{start.toLocaleDateString(undefined, { month: "long", day: "numeric" })} – {addDays(start,6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</h2>
        <button className="btn primary" onClick={planWeek} disabled={busy}>
          {busy ? "Thinking…" : "Plan my week"}
        </button>
      </div>

      <div className="days">
        {DAYS.map((d, i) => {
          const slot = plan[i];
          const meal = slot ? state.meals[slot.mealId] : null;
          const isToday = daysBetween(weekStart(), today()) === i;
          return (
            <div key={i} className={`day ${isToday ? "now" : ""} ${slot?.cooked ? "done" : ""}`}>
              <div className="daylabel">
                <span className="dname">{d}</span>
                <span className="dnum">{addDays(start, i).getDate()}</span>
              </div>
              {meal ? (
                <div className="mealcard">
                  <div className="mealtop">
                    <div>
                      <p className="mealname">{meal.name}</p>
                      {meal.why && <p className="why">{meal.why}</p>}
                    </div>
                    {slot.cooked && <span className="tickdone">Cooked</span>}
                  </div>
                  <div className="mealings">
                    {meal.ingredients.map((x, k) => {
                      const inv = state.inventory.find(v => v.ingredientId === x.ingredientId && v.state !== "out");
                      return (
                        <span key={k} className={`ing ${inv ? "have" : "need"}`}>
                          {ingName(state, x.ingredientId)}{x.note ? ` ${x.note}` : ""}
                        </span>
                      );
                    })}
                  </div>
                  {!slot.cooked && (
                    <div className="mealacts">
                      <button className="btn tiny" onClick={() => setSheet({ cook: i })}>Mark cooked</button>
                      <button className="btn tiny ghost" onClick={() => clearDay(i)}>Clear</button>
                    </div>
                  )}
                </div>
              ) : (
                <button className="emptyslot" onClick={() => setSheet({ day: i })}>+ Add a meal</button>
              )}
            </div>
          );
        })}
      </div>

      {sheet?.day !== undefined && (
        <AddMealSheet state={state} onClose={() => setSheet(null)} onPick={(m) => { applyMealToDay(m, sheet.day); setSheet(null); }} flash={flash} />
      )}
      {sheet?.cook !== undefined && (
        <CookSheet state={state} setState={setState} day={sheet.cook} wk={wk} award={award} flash={flash} onClose={() => setSheet(null)} />
      )}
    </div>
  );

  function applyMealToDay(m, day) {
    setState(s => {
      const custom = { ...s.custom };
      const ings = [];
      (m.ing || []).forEach(x => { if (byId(x.id) || custom[x.id]) ings.push({ ingredientId: x.id, note: x.q || "", essential: x.e !== 0 }); });
      (m.new || []).forEach(x => {
        const id = "x_" + x.n.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        if (!custom[id]) custom[id] = { id, name: x.n, aisle: AISLES.includes(x.a) ? x.a : "Dry Goods", loc: x.a === "Produce" ? "fridge" : "pantry", life: x.a === "Produce" ? 7 : 90, plant: x.a === "Produce", protein: null };
        ings.push({ ingredientId: id, note: x.q || "", essential: x.e !== 0 });
      });
      const id = uid();
      const meals = { ...s.meals, [id]: { id, name: m.n, cuisine: m.c || "", ingredients: ings, kcal: m.kcal || null, protein: m.pro || null, why: m.why || "" } };
      const p = { ...(s.plan[wk] || {}), [day]: { mealId: id, cooked: false } };
      return { ...s, custom, meals, plan: { ...s.plan, [wk]: p } };
    });
  }
}

/* ---------- add meal (reverse direction: meal -> ingredients) ---------- */
function AddMealSheet({ state, onClose, onPick, flash }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const cookable = useMemo(() => {
    const have = new Set(state.inventory.filter(i => i.state !== "out").map(i => i.ingredientId));
    return Object.values(state.meals).map(m => {
      const ess = m.ingredients.filter(x => x.essential);
      const missing = ess.filter(x => !have.has(x.ingredientId));
      return { m, missing: missing.length };
    }).sort((a, b) => a.missing - b.missing).slice(0, 6);
  }, [state]);

  async function fetchIngredients() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const prompt = `INGREDIENT CATALOG (use these ids only):
${catalogLines()}

The user wants to cook: "${name}" for ${state.prefs.people} people.
List what they need to buy or have.

Reply with JSON ONLY:
{"meals":[{"n":"${name}","c":"cuisine","ing":[{"id":"catalog_id","q":"~400g","e":1}],"new":[{"n":"name","a":"Produce","q":"2 stalks","e":1}],"kcal":520,"pro":38,"why":""}]}
"e" is 1 if essential, 0 if optional. kcal and pro are per serving. Use "new" only for ingredients not in the catalog.`;
      const out = await askClaude(prompt, 1500);
      if (!out.meals || !out.meals[0]) throw new Error("No meal in response.");
      onPick(out.meals[0]);
    } catch (e) {
      console.error("fetchIngredients failed:", e);
      flash(`Couldn't work out the ingredients — ${e.message || "try a simpler name"}`);
      setBusy(false);
    }
  }

  return (
    <Sheet title="Add a meal" onClose={onClose}>
      <label className="lbl">What do you want to cook?</label>
      <div className="row">
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Chicken rendang, pasta pesto…" />
        <button className="btn primary" onClick={fetchIngredients} disabled={busy || !name.trim()}>
          {busy ? "…" : "Find"}
        </button>
      </div>
      <p className="hint">Claude works out the ingredients and adds anything missing to your list.</p>

      {cookable.length > 0 && (
        <>
          <p className="lbl mt">Or cook something again</p>
          {cookable.map(({ m, missing }) => (
            <button key={m.id} className="repeat" onClick={() => onPick(toRaw(m))}>
              <span className="rname">{m.name}</span>
              <span className={missing === 0 ? "badge ok" : "badge warn"}>
                {missing === 0 ? "Cookable now" : `${missing} missing`}
              </span>
            </button>
          ))}
        </>
      )}
    </Sheet>
  );

  function toRaw(m) {
    return {
      n: m.name, c: m.cuisine, kcal: m.kcal, pro: m.protein, why: m.why,
      ing: m.ingredients.map(x => ({ id: x.ingredientId, q: x.note, e: x.essential ? 1 : 0 })),
      new: [],
    };
  }
}

/* ---------- cook sheet ---------- */
function CookSheet({ state, setState, day, wk, award, flash, onClose }) {
  const slot = (state.plan[wk] || {})[day];
  const meal = state.meals[slot.mealId];
  const rows = meal.ingredients
    .map(x => ({ x, inv: state.inventory.find(v => v.ingredientId === x.ingredientId && v.state !== "out") }))
    .filter(r => r.inv);
  const [marks, setMarks] = useState({});

  function confirm() {
    let rescued = 0;
    setState(s => {
      const inventory = s.inventory.map(i => {
        const m = marks[i.id];
        if (!m) return i;
        if (m === "out") return { ...i, state: "out", updatedAt: Date.now() };
        if (m === "low") return { ...i, state: "low", updatedAt: Date.now() };
        return i;
      });
      const p = { ...(s.plan[wk] || {}) };
      p[day] = { ...p[day], cooked: true, cookedAt: iso(today()) };
      return {
        ...s,
        inventory,
        plan: { ...s.plan, [wk]: p },
        cookedLog: [...s.cookedLog, { mealId: meal.id, date: iso(today()) }],
      };
    });

    rows.forEach(r => { const f = freshness(r.inv); if (f.days !== null && f.days <= 2) rescued++; });
    const pts = 10 + rescued * 15;
    award(pts, rescued > 0 ? `Cooked — ${rescued} ingredient${rescued > 1 ? "s" : ""} rescued` : "Cooked");

    // Rescuing near-expiry food sometimes gifts a fish directly, on top of the
    // coin bonus from award() above — see GAMIFICATION.md §2.
    if (rescued > 0) {
      const fish = rollRescueFish(state.game.aquarium);
      if (fish) {
        setState(s => ({ ...s, game: { ...s.game, aquarium: [...s.game.aquarium, { speciesId: fish.id, acquiredAt: Date.now(), via: "rescue" }] } }));
        setTimeout(() => flash(`Rescued! A ${fish.name} joined your tank`), 2700);
      }
    }
    onClose();
  }

  return (
    <Sheet title={meal.name} onClose={onClose}>
      <p className="hint">Everything stays as it is unless you say otherwise.</p>
      {rows.length === 0 && <p className="empty">None of these are in your kitchen yet.</p>}
      {rows.map(r => {
        const f = freshness(r.inv);
        const cur = marks[r.inv.id] || "fine";
        return (
          <div key={r.inv.id} className="cookrow">
            <div>
              <p className="cname">{ingName(state, r.x.ingredientId)}</p>
              {f.days !== null && f.days <= 2 && <span className="rescue">Rescue bonus +15</span>}
            </div>
            <div className="seg">
              {["fine","low","out"].map(k => (
                <button key={k} className={cur === k ? "segb on" : "segb"} onClick={() => setMarks(m => ({ ...m, [r.inv.id]: k }))}>
                  {k === "fine" ? "Still fine" : k === "low" ? "Low" : "Used up"}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <button className="btn primary wide mt" onClick={confirm}>Mark it cooked</button>
    </Sheet>
  );
}

/* ============================================================
   FRIDGE
   ============================================================ */
function FridgeView({ state, setState, flash }) {
  const items = state.inventory
    .filter(i => i.state !== "out")
    .map(i => ({ ...i, f: freshness(i) }))
    .sort((a, b) => (a.f.days ?? 999) - (b.f.days ?? 999));

  const counts = items.reduce((a, i) => { a[i.f.key] = (a[i.f.key] || 0) + 1; return a; }, {});
  const total = items.length || 1;

  const groups = ["fridge","freezer","pantry"].map(loc => ({ loc, items: items.filter(i => i.location === loc) })).filter(g => g.items.length);

  function cycle(id) {
    setState(s => ({
      ...s,
      inventory: s.inventory.map(i => i.id === id ? { ...i, state: i.state === "plenty" ? "low" : i.state === "low" ? "out" : "plenty", updatedAt: Date.now() } : i),
    }));
  }
  function toList(item) {
    setState(s => ({ ...s, list: [...s.list, { id: uid(), ingredientId: item.ingredientId, note: "", checked: false }] }));
    flash(`${ingName(state, item.ingredientId)} added to your list`);
  }

  const gone = state.inventory.filter(i => i.state !== "out" && freshness(i).key === "gone");
  function tossAll() {
    const tossedCount = gone.length;
    setState(s => {
      const inventory = s.inventory.map(i => gone.find(g => g.id === i.id) ? { ...i, state: "out", tossed: true } : i);
      // Monthly waste counter for the ocean-floor scene's dirtiness — resets on
      // month rollover, archiving the prior month into wasteLog. Cosmetic only:
      // never touches points, coins, fish, or streak. See GAMIFICATION.md §6.
      const nowMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      let { wasteThisMonth, wasteMonth, wasteLog } = s.game;
      if (wasteMonth !== nowMonth) {
        wasteLog = wasteMonth ? { ...wasteLog, [wasteMonth]: wasteThisMonth } : wasteLog;
        wasteThisMonth = 0;
        wasteMonth = nowMonth;
      }
      return { ...s, inventory, game: { ...s.game, wasteThisMonth: wasteThisMonth + tossedCount, wasteMonth, wasteLog } };
    });
    flash("Cleared. Fresh start.");
  }

  if (items.length === 0) return (
    <div className="view">
      <EmptyState title="Your kitchen is empty" body="Check items off your shopping list and they land here automatically." />
    </div>
  );

  return (
    <div className="view">
      <div className="pulse">
        <p className="pulse-h">Kitchen pulse</p>
        <div className="pulsebar">
          {["fresh","soon","gone"].map(k => counts[k] ? <span key={k} className={`pseg ${k}`} style={{ width: `${(counts[k] / total) * 100}%` }} /> : null)}
        </div>
        <div className="pulsekey">
          <span><i className="dot fresh" />{counts.fresh || 0} fresh</span>
          <span><i className="dot soon" />{counts.soon || 0} use soon</span>
          <span><i className="dot gone" />{counts.gone || 0} past date</span>
        </div>
        {gone.length > 0 && <button className="btn tiny ghost mt" onClick={tossAll}>Clear {gone.length} past-date item{gone.length > 1 ? "s" : ""}</button>}
      </div>

      {groups.map(g => (
        <div key={g.loc} className="group">
          <p className="grouph">{g.loc}</p>
          {g.items.map(i => (
            <div key={i.id} className="item">
              <button className="itemmain" onClick={() => cycle(i.id)}>
                <div className="itemtop">
                  <span className="iname">{ingName(state, i.ingredientId)}</span>
                  <span className={`state ${i.state}`}>{i.state === "plenty" ? "Plenty" : "Running low"}</span>
                </div>
                <div className="freshwrap">
                  <div className="freshbar">
                    <span className={`fill ${i.f.key}`} style={{ width: `${barWidth(i)}%` }} />
                  </div>
                  <span className={`fdays ${i.f.key}`}>{i.f.label}</span>
                </div>
              </button>
              <button className="addback" onClick={() => toList(i)} aria-label="Add to list">+</button>
            </div>
          ))}
        </div>
      ))}
      <p className="footnote">Tap an item to move it between plenty → low → out. Anything low nudges itself onto your list.</p>
    </div>
  );

  function barWidth(i) {
    const meta = ingMeta(state, i.ingredientId);
    const left = daysBetween(today(), i.expiresAt);
    return Math.max(4, Math.min(100, (left / meta.life) * 100));
  }
}

/* ============================================================
   LIST
   ============================================================ */
function ListView({ state, setState, award, flash }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    if (!q.trim()) return [];
    const all = [...CATALOG, ...Object.values(state.custom)];
    return all.filter(c => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
  }, [q, state.custom]);

  const lowItems = state.inventory.filter(i => i.state === "low" && !state.list.find(l => l.ingredientId === i.ingredientId && !l.checked));

  function add(ingredientId, note = "") {
    setState(s => ({ ...s, list: [...s.list, { id: uid(), ingredientId, note, checked: false }] }));
    setQ("");
  }
  function addFree(name) {
    const id = "x_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    setState(s => ({
      ...s,
      custom: { ...s.custom, [id]: s.custom[id] || { id, name, aisle: "Dry Goods", loc: "pantry", life: 30, plant: false, protein: null } },
      list: [...s.list, { id: uid(), ingredientId: id, note: "", checked: false }],
    }));
    setQ("");
  }

  function toggle(rowId) {
    setState(s => ({ ...s, list: s.list.map(l => l.id === rowId ? { ...l, checked: !l.checked } : l) }));
  }
  function remove(rowId) {
    setState(s => ({ ...s, list: s.list.filter(l => l.id !== rowId) }));
  }

  function putAway() {
    const rows = state.list.filter(l => l.checked);
    if (!rows.length) return;
    setState(s => {
      const inv = [...s.inventory];
      rows.forEach(r => {
        const meta = ingMeta(s, r.ingredientId);
        const existing = inv.findIndex(i => i.ingredientId === r.ingredientId);
        const fresh = {
          id: uid(), ingredientId: r.ingredientId, location: meta.loc, state: "plenty",
          purchasedAt: iso(today()), expiresAt: iso(addDays(today(), meta.life)), updatedAt: Date.now(),
        };
        if (existing >= 0) inv[existing] = fresh; else inv.push(fresh);
      });
      return { ...s, inventory: inv, list: s.list.filter(l => !l.checked) };
    });
    award(20, `${rows.length} item${rows.length > 1 ? "s" : ""} put away`);
  }

  async function fillFromPlan() {
    setBusy(true);
    const wk = iso(weekStart());
    const plan = state.plan[wk] || {};
    const have = new Set(state.inventory.filter(i => i.state === "plenty").map(i => i.ingredientId));
    const need = new Map();
    Object.values(plan).forEach(slot => {
      const m = state.meals[slot.mealId];
      if (!m || slot.cooked) return;
      m.ingredients.forEach(x => {
        if (have.has(x.ingredientId)) return;
        if (state.list.find(l => l.ingredientId === x.ingredientId && !l.checked)) return;
        if (!need.has(x.ingredientId)) need.set(x.ingredientId, x.note);
      });
    });
    if (need.size === 0) { flash("Nothing to add — you already have it all."); setBusy(false); return; }
    setState(s => ({ ...s, list: [...s.list, ...[...need].map(([id, note]) => ({ id: uid(), ingredientId: id, note, checked: false }))] }));
    flash(`${need.size} item${need.size > 1 ? "s" : ""} added from your plan`);
    setBusy(false);
  }

  const grouped = AISLES.map(a => ({
    aisle: a,
    rows: state.list.filter(l => ingMeta(state, l.ingredientId).aisle === a),
  })).filter(g => g.rows.length);

  const checkedCount = state.list.filter(l => l.checked).length;

  return (
    <div className="view">
      <div className="addbar">
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Add an item…"
          onKeyDown={e => { if (e.key === "Enter" && q.trim()) { suggestions[0] ? add(suggestions[0].id) : addFree(q.trim()); } }} />
      </div>
      {suggestions.length > 0 && (
        <div className="sugg">
          {suggestions.map(s => <button key={s.id} onClick={() => add(s.id)}>{s.name}<span>{s.aisle}</span></button>)}
          <button className="freeadd" onClick={() => addFree(q.trim())}>Add “{q.trim()}” as new</button>
        </div>
      )}

      <div className="quickacts">
        <button className="btn ghost" onClick={fillFromPlan} disabled={busy}>Fill from this week's plan</button>
      </div>

      {lowItems.length > 0 && (
        <div className="nudge">
          <p className="nudgeh">Running low</p>
          <div className="chips">
            {lowItems.map(i => <button key={i.id} className="chip tap" onClick={() => add(i.ingredientId)}>+ {ingName(state, i.ingredientId)}</button>)}
          </div>
        </div>
      )}

      {state.list.length === 0 ? (
        <EmptyState title="Nothing on the list" body="Type an item above, or pull one straight from this week's plan." />
      ) : (
        <>
          {grouped.map(g => (
            <div key={g.aisle} className="group">
              <p className="grouph">{g.aisle}</p>
              {g.rows.map(r => (
                <div key={r.id} className={`listrow ${r.checked ? "checked" : ""}`}>
                  <button className="check" onClick={() => toggle(r.id)} aria-label="Check off">
                    {r.checked && <Tick />}
                  </button>
                  <button className="listname" onClick={() => toggle(r.id)}>
                    {ingName(state, r.ingredientId)}
                    {r.note && <span className="note">{r.note}</span>}
                  </button>
                  <button className="del" onClick={() => remove(r.id)} aria-label="Remove">×</button>
                </div>
              ))}
            </div>
          ))}
          {checkedCount > 0 && (
            <div className="stickyact">
              <button className="btn primary wide" onClick={putAway}>Put away {checkedCount} item{checkedCount > 1 ? "s" : ""}</button>
              <p className="hint center">They go into the fridge or pantry with a use-by date already set.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   PROGRESS + NUTRITION
   ============================================================ */
function ProgressView({ state, setState, wk, plan, flash }) {
  const [armed, setArmed] = useState(false);
  const slots = Object.values(plan);
  const planned = slots.length;
  const cooked = slots.filter(s => s.cooked).length;
  const pct = planned ? Math.round((cooked / planned) * 100) : 0;

  const meals = slots.map(s => state.meals[s.mealId]).filter(Boolean);

  const plants = new Set();
  const proteins = new Set();
  let kcal = 0, pro = 0, counted = 0;
  meals.forEach(m => {
    m.ingredients.forEach(x => {
      const meta = ingMeta(state, x.ingredientId);
      if (meta.plant) plants.add(meta.id);
      if (meta.protein) proteins.add(meta.protein);
    });
    if (m.kcal) { kcal += m.kcal; pro += m.protein || 0; counted++; }
  });

  const avgKcal = counted ? Math.round(kcal / counted / 10) * 10 : null;
  const avgPro = counted ? Math.round(pro / counted) : null;

  const gaps = [];
  if (plants.size < 15 && meals.length > 0) gaps.push(`${plants.size} distinct plants — aim for 15+ across the week`);
  if (meals.length > 0 && !proteins.has("fish")) gaps.push("No fish planned this week");
  if (meals.length > 0 && !proteins.has("legume")) gaps.push("No legumes planned — beans, lentils, tofu or tempeh");

  const wasted = state.inventory.filter(i => i.tossed).length;

  const badges = [
    { id: "first", name: "First meal cooked", got: state.cookedLog.length >= 1 },
    { id: "full", name: "Cooked a whole week", got: planned >= 7 && cooked >= 7 },
    { id: "plants", name: "20 plants in a week", got: plants.size >= 20 },
    { id: "rescue", name: "Nothing went to waste", got: state.cookedLog.length >= 3 && wasted === 0 },
    { id: "rotate", name: "Four proteins in a week", got: proteins.size >= 4 },
  ];

  return (
    <div className="view">
      <div className="ringcard">
        <Ring pct={pct} />
        <div>
          <p className="bignum">{cooked}<span>/{planned || 7}</span></p>
          <p className="biglabel">meals cooked this week</p>
          <p className="streak">{state.game.freshStreak} week fresh streak · {state.game.points} points</p>
        </div>
      </div>

      <div className="card">
        <p className="cardh">This week's food, roughly</p>
        <div className="metrics">
          <Metric v={plants.size} l="distinct plants" tone={plants.size >= 15 ? "good" : "mid"} />
          <Metric v={proteins.size} l="protein sources" tone={proteins.size >= 4 ? "good" : "mid"} />
          <Metric v={avgPro ? `${avgPro}g` : "—"} l="protein per serving" tone="flat" />
          <Metric v={avgKcal ? `~${avgKcal}` : "—"} l="kcal per serving" tone="flat" />
        </div>
        <div className="proteinrow">
          {Object.keys(PROTEIN_LABEL).map(k => (
            <span key={k} className={proteins.has(k) ? "ptag on" : "ptag"}>{PROTEIN_LABEL[k]}</span>
          ))}
        </div>
        {gaps.length > 0 && (
          <ul className="gaps">{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
        )}
        <p className="disclaimer">Calorie and protein figures are rough estimates for a whole serving, not measured values. They're here to spot patterns across the week, not to count.</p>
      </div>

      <div className="card">
        <p className="cardh">Badges</p>
        <div className="badges">
          {badges.map(b => <span key={b.id} className={b.got ? "badgechip got" : "badgechip"}>{b.name}</span>)}
        </div>
      </div>

      <div className="card">
        <p className="cardh">Household</p>
        <label className="lbl">Anything to avoid</label>
        <input className="input" value={state.prefs.avoid} placeholder="shellfish, too spicy…"
          onChange={e => setState(s => ({ ...s, prefs: { ...s.prefs, avoid: e.target.value } }))} />
        <label className="lbl mt">Cuisines you like</label>
        <input className="input" value={state.prefs.cuisines} placeholder="Indonesian, Italian, Japanese…"
          onChange={e => setState(s => ({ ...s, prefs: { ...s.prefs, cuisines: e.target.value } }))} />
        <button className={armed ? "btn wide mt danger" : "btn ghost wide mt"}
          onClick={() => { if (armed) { setState(emptyState()); flash("Started over."); setArmed(false); } else { setArmed(true); setTimeout(() => setArmed(false), 4000); } }}>
          {armed ? "Tap again to erase everything" : "Reset everything"}
        </button>
      </div>
    </div>
  );
}

function Metric({ v, l, tone }) {
  return <div className={`metric ${tone}`}><p className="mv">{v}</p><p className="ml">{l}</p></div>;
}

function Ring({ pct }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg width="86" height="86" viewBox="0 0 86 86" className="ring">
      <circle cx="43" cy="43" r={r} className="rbg" />
      <circle cx="43" cy="43" r={r} className="rfg" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} />
    </svg>
  );
}

/* ---------- shared bits ---------- */
function Sheet({ title, children, onClose }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheethead">
          <h3>{title}</h3>
          <button className="close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="sheetbody">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return <div className="emptystate"><p className="eh">{title}</p><p className="eb">{body}</p></div>;
}

const Tick = () => <svg viewBox="0 0 16 16" width="13" height="13"><path d="M2.5 8.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function TabIcon({ k, on }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      {k === "week" && <g {...s}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></g>}
      {k === "fridge" && <g {...s}><rect x="5" y="2.5" width="14" height="19" rx="2.5" /><path d="M5 10h14M8.5 6v2M8.5 13v3" /></g>}
      {k === "list" && <g {...s}><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></g>}
      {k === "progress" && <g {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>}
      {k === "tank" && <g {...s}><path d="M3 8c2-2 4 2 6 0s4-2 6 0 4 2 6 0" /><path d="M3 14c2-2 4 2 6 0s4-2 6 0 4 2 6 0" /><path d="M3 19h18" /></g>}
    </svg>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
function Styles() {
  return <style>{`
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

*,*::before,*::after{box-sizing:border-box}
.app,.boot{
  --plum:#3B2145; --plum-lt:#5A3568; --lime:#C6E14B;
  --porcelain:#E7ECEA; --card:#fff; --ink:#16211E; --muted:#63736D; --line:#D6DFDB;
  --fresh:#1B6B4F; --soon:#C87A16; --gone:#B2402F;
  --fresh-b:#E3F1EA; --soon-b:#FBEEDC; --gone-b:#F8E3DF;
  font-family:'Inter',system-ui,sans-serif; color:var(--ink); background:var(--porcelain);
  min-height:100%; display:flex; flex-direction:column;
}
.app{position:relative;min-height:100vh}
.boot{align-items:center;justify-content:center;gap:14px;min-height:100vh;color:var(--muted)}
.mark{width:26px;height:26px;border-radius:8px;background:var(--plum);position:relative;display:inline-block;flex:none}
.mark::after{content:"";position:absolute;inset:7px 7px auto 7px;height:4px;border-radius:2px;background:var(--lime)}

/* top bar */
.top{position:sticky;top:0;z-index:20;background:var(--plum);color:#fff;
  padding:14px 18px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:10px}
.brand .mark{background:rgba(255,255,255,.16)}
.top h1{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:21px;margin:0;letter-spacing:-.02em}
.score{display:flex;align-items:baseline;gap:4px}
.pts{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:19px;color:var(--lime)}
.ptslabel{font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:.09em}

.body{flex:1;padding:16px 14px 96px;max-width:640px;width:100%;margin:0 auto}
.view{display:flex;flex-direction:column;gap:16px}

/* type */
h2{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:600;margin:0;letter-spacing:-.01em}
.lbl{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:7px}
.hint{font-size:12.5px;color:var(--muted);margin:8px 0 0;line-height:1.5}
.hint.center{text-align:center}
.mt{margin-top:16px}
.footnote{font-size:12px;color:var(--muted);text-align:center;line-height:1.5;padding:0 12px}

/* buttons */
.btn{font-family:inherit;font-size:13.5px;font-weight:600;border:none;border-radius:10px;padding:10px 15px;cursor:pointer;transition:.15s;background:var(--card);color:var(--ink);border:1px solid var(--line)}
.btn:hover{transform:translateY(-1px)}
.btn:disabled{opacity:.5;cursor:default;transform:none}
.btn.primary{background:var(--plum);color:#fff;border-color:var(--plum)}
.btn.ghost{background:transparent;color:var(--muted)}
.btn.tiny{padding:7px 11px;font-size:12.5px;border-radius:8px}
.btn.wide{width:100%}
.btn.danger{background:var(--gone);color:#fff;border-color:var(--gone)}
.btn:focus-visible,.tab:focus-visible,.check:focus-visible,.itemmain:focus-visible{outline:2.5px solid var(--plum-lt);outline-offset:2px}

.sectionhead{display:flex;align-items:center;justify-content:space-between;gap:10px}

/* urgent strip */
.urgent{background:var(--soon-b);border-radius:14px;padding:13px 15px}
.urgent-h{font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:700;margin:0 0 9px;color:#8A5410;text-transform:uppercase;letter-spacing:.06em}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{font-size:12px;font-weight:500;padding:5px 10px;border-radius:999px;background:#fff;border:1px solid rgba(0,0,0,.07)}
.chip.gone{color:var(--gone)} .chip.soon{color:var(--soon)} .chip.fresh{color:var(--fresh)}
.chip.tap{cursor:pointer;color:var(--plum);font-weight:600;border-color:var(--line)}

/* days */
.days{display:flex;flex-direction:column;gap:9px}
.day{display:flex;gap:11px;align-items:flex-start}
.daylabel{width:42px;flex:none;text-align:center;padding-top:9px}
.dname{display:block;font-size:10.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.dnum{display:block;font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;line-height:1.25}
.day.now .dnum{color:var(--plum)}
.day.now .daylabel{position:relative}
.day.now .daylabel::after{content:"";position:absolute;left:50%;transform:translateX(-50%);bottom:-4px;width:16px;height:2.5px;border-radius:2px;background:var(--lime)}
.mealcard{flex:1;background:var(--card);border-radius:13px;padding:13px 14px;border:1px solid var(--line)}
.day.done .mealcard{background:var(--fresh-b);border-color:#C4E0D2}
.mealtop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.mealname{font-family:'Bricolage Grotesque',sans-serif;font-size:15.5px;font-weight:600;margin:0;letter-spacing:-.01em}
.why{font-size:12px;color:var(--muted);margin:3px 0 0;font-style:italic}
.tickdone{font-size:10.5px;font-weight:700;color:var(--fresh);text-transform:uppercase;letter-spacing:.07em;flex:none}
.mealings{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.ing{font-size:11.5px;padding:3px 8px;border-radius:6px}
.ing.have{background:var(--fresh-b);color:var(--fresh)}
.ing.need{background:#EFF1F0;color:var(--muted);text-decoration:underline dotted rgba(0,0,0,.25)}
.mealacts{display:flex;gap:7px;margin-top:11px}
.emptyslot{flex:1;background:transparent;border:1.5px dashed var(--line);border-radius:13px;padding:15px;color:var(--muted);font-family:inherit;font-size:13px;cursor:pointer;transition:.15s}
.emptyslot:hover{border-color:var(--plum);color:var(--plum)}

/* pulse */
.pulse{background:var(--card);border-radius:14px;padding:15px;border:1px solid var(--line)}
.pulse-h{font-family:'Bricolage Grotesque',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 10px}
.pulsebar{display:flex;height:9px;border-radius:5px;overflow:hidden;background:#EEF1F0}
.pseg.fresh{background:var(--fresh)} .pseg.soon{background:var(--soon)} .pseg.gone{background:var(--gone)}
.pulsekey{display:flex;gap:14px;margin-top:10px;flex-wrap:wrap}
.pulsekey span{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:5px}
.dot{width:7px;height:7px;border-radius:50%;display:inline-block}
.dot.fresh{background:var(--fresh)} .dot.soon{background:var(--soon)} .dot.gone{background:var(--gone)}

/* groups + items */
.group{display:flex;flex-direction:column;gap:7px}
.grouph{font-family:'Bricolage Grotesque',sans-serif;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin:4px 0 2px}
.item{display:flex;gap:8px;align-items:stretch}
.itemmain{flex:1;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:11px 13px;cursor:pointer;font-family:inherit;transition:.15s}
.itemmain:hover{border-color:#BFCCC7}
.itemtop{display:flex;justify-content:space-between;align-items:center;gap:8px}
.iname{font-size:14.5px;font-weight:500}
.state{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;flex:none}
.state.plenty{color:var(--fresh)} .state.low{color:var(--soon)}
.freshwrap{display:flex;align-items:center;gap:9px;margin-top:8px}
.freshbar{flex:1;height:4px;border-radius:3px;background:#EDF0EF;overflow:hidden}
.fill{display:block;height:100%;border-radius:3px}
.fill.fresh{background:var(--fresh)} .fill.soon{background:var(--soon)} .fill.gone{background:var(--gone)}
.fdays{font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:500;flex:none}
.fdays.fresh{color:var(--muted)} .fdays.soon{color:var(--soon)} .fdays.gone{color:var(--gone)}
.addback{width:40px;flex:none;border:1px solid var(--line);background:var(--card);border-radius:12px;font-size:19px;color:var(--muted);cursor:pointer;transition:.15s}
.addback:hover{color:var(--plum);border-color:var(--plum)}

/* list */
.addbar{display:flex;gap:8px}
.input{flex:1;width:100%;font-family:inherit;font-size:14.5px;padding:11px 13px;border-radius:11px;border:1px solid var(--line);background:var(--card);color:var(--ink)}
.input:focus{outline:none;border-color:var(--plum)}
.row{display:flex;gap:8px}
.sugg{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:11px;overflow:hidden;margin-top:-8px}
.sugg button{text-align:left;padding:10px 13px;background:none;border:none;border-bottom:1px solid var(--line);font-family:inherit;font-size:14px;cursor:pointer;display:flex;justify-content:space-between}
.sugg button:last-child{border-bottom:none}
.sugg button:hover{background:var(--porcelain)}
.sugg span{font-size:11px;color:var(--muted)}
.freeadd{color:var(--plum);font-weight:600}
.quickacts{display:flex;gap:8px;flex-wrap:wrap}
.nudge{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:13px}
.nudgeh{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--soon);margin:0 0 9px}
.listrow{display:flex;align-items:center;gap:11px;background:var(--card);border:1px solid var(--line);border-radius:11px;padding:10px 12px}
.listrow.checked{background:var(--fresh-b);border-color:#C9E2D5}
.check{width:23px;height:23px;flex:none;border-radius:7px;border:1.8px solid var(--line);background:#fff;cursor:pointer;display:grid;place-items:center;color:#fff;transition:.15s}
.listrow.checked .check{background:var(--fresh);border-color:var(--fresh)}
.listname{flex:1;text-align:left;background:none;border:none;font-family:inherit;font-size:14.5px;cursor:pointer;color:inherit;padding:0}
.listrow.checked .listname{text-decoration:line-through;color:var(--muted)}
.note{font-size:11.5px;color:var(--muted);margin-left:7px}
.del{background:none;border:none;font-size:19px;color:#B6C2BD;cursor:pointer;padding:0 4px;line-height:1}
.del:hover{color:var(--gone)}
.stickyact{position:sticky;bottom:82px;padding-top:6px}

/* progress */
.ringcard{background:var(--plum);color:#fff;border-radius:16px;padding:18px;display:flex;align-items:center;gap:18px}
.ring .rbg{fill:none;stroke:rgba(255,255,255,.18);stroke-width:7}
.ring .rfg{fill:none;stroke:var(--lime);stroke-width:7;stroke-linecap:round;transform:rotate(-90deg);transform-origin:43px 43px;transition:stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)}
.bignum{font-family:'Bricolage Grotesque',sans-serif;font-size:34px;font-weight:800;margin:0;line-height:1;letter-spacing:-.03em}
.bignum span{font-size:19px;opacity:.5;font-weight:600}
.biglabel{font-size:13px;opacity:.8;margin:5px 0 0}
.streak{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--lime);margin:9px 0 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:15px;padding:16px}
.cardh{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:700;margin:0 0 13px;letter-spacing:-.01em}
.metrics{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.metric{background:var(--porcelain);border-radius:11px;padding:12px}
.metric.good{background:var(--fresh-b)}
.metric.mid{background:var(--soon-b)}
.mv{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;margin:0;line-height:1;letter-spacing:-.02em}
.metric.good .mv{color:var(--fresh)} .metric.mid .mv{color:var(--soon)}
.ml{font-size:11.5px;color:var(--muted);margin:5px 0 0}
.proteinrow{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}
.ptag{font-size:11.5px;padding:4px 9px;border-radius:999px;background:var(--porcelain);color:#9AA8A3}
.ptag.on{background:var(--plum);color:#fff}
.gaps{margin:13px 0 0;padding-left:17px;display:flex;flex-direction:column;gap:5px}
.gaps li{font-size:12.5px;color:var(--soon);line-height:1.45}
.disclaimer{font-size:11.5px;color:var(--muted);line-height:1.5;margin:13px 0 0;padding-top:11px;border-top:1px solid var(--line)}
.badges{display:flex;flex-wrap:wrap;gap:6px}
.badgechip{font-size:12px;padding:6px 11px;border-radius:999px;background:var(--porcelain);color:#A2AFAA}
.badgechip.got{background:var(--lime);color:#3A4A0C;font-weight:600}

/* sheets */
.scrim{position:fixed;inset:0;background:rgba(22,33,30,.45);z-index:60;display:flex;align-items:flex-end;justify-content:center;animation:fade .18s}
.sheet{background:var(--porcelain);width:100%;max-width:640px;border-radius:20px 20px 0 0;max-height:88vh;display:flex;flex-direction:column;animation:rise .26s cubic-bezier(.3,1,.4,1)}
@keyframes fade{from{opacity:0}} @keyframes rise{from{transform:translateY(24px)}}
.sheethead{display:flex;justify-content:space-between;align-items:center;padding:17px 18px 12px;border-bottom:1px solid var(--line)}
.sheethead h3{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:700;margin:0;letter-spacing:-.01em}
.close{background:none;border:none;font-size:25px;color:var(--muted);cursor:pointer;line-height:1;padding:0 4px}
.sheetbody{padding:17px 18px 26px;overflow-y:auto}
.cookrow{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:9px}
.cname{font-size:14.5px;font-weight:500;margin:0}
.rescue{font-size:10.5px;font-weight:700;color:var(--soon);text-transform:uppercase;letter-spacing:.05em}
.seg{display:flex;gap:5px;margin-top:9px}
.segb{flex:1;font-family:inherit;font-size:12px;padding:7px;border-radius:8px;border:1px solid var(--line);background:var(--porcelain);cursor:pointer;color:var(--muted)}
.segb.on{background:var(--plum);color:#fff;border-color:var(--plum);font-weight:600}
.repeat{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;background:var(--card);border:1px solid var(--line);border-radius:11px;padding:12px 13px;margin-bottom:7px;cursor:pointer;font-family:inherit;text-align:left}
.rname{font-size:14.5px;font-weight:500}
.badge{font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;flex:none}
.badge.ok{background:var(--fresh-b);color:var(--fresh)}
.badge.warn{background:var(--soon-b);color:var(--soon)}

/* empty */
.emptystate{text-align:center;padding:46px 22px}
.eh{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:600;margin:0 0 7px}
.eb{font-size:13.5px;color:var(--muted);margin:0;line-height:1.55;max-width:290px;margin-inline:auto}
.empty{font-size:13px;color:var(--muted)}

/* toast */
.toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:11px 17px;border-radius:11px;font-size:13.5px;font-weight:500;z-index:70;animation:rise .22s;box-shadow:0 8px 24px rgba(0,0,0,.2);max-width:88vw;text-align:center}

/* tabs */
.tabs{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);display:flex;z-index:30;padding-bottom:env(safe-area-inset-bottom)}
.tab{flex:1;background:none;border:none;padding:10px 4px 12px;display:flex;flex-direction:column;align-items:center;gap:4px;font-family:inherit;font-size:10.5px;font-weight:500;color:#9AA8A3;cursor:pointer;transition:.15s}
.tab.on{color:var(--plum);font-weight:600}

@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media (min-width:560px){.metrics{grid-template-columns:repeat(4,1fr)}}

/* ---------- aquarium / ocean floor (GAMIFICATION.md) ---------- */
.coinschip{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.14);border-radius:999px;padding:3px 9px 3px 6px;font-size:12.5px;font-weight:700;margin-left:6px}
.wallet{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:9px 16px;width:fit-content;margin:14px auto 18px;font-size:14px;font-weight:700}
.shopgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px}
.shopcard{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px}
.shopcard.owned{opacity:.7}
.shopname{font-size:13px;font-weight:600;margin:0}
.shopfact{font-size:10.5px;color:var(--muted);line-height:1.35;min-height:38px;margin:0}
.shopowned{font-size:11px;font-weight:600;color:var(--fresh);background:var(--fresh-b);border-radius:999px;padding:4px 10px}

.tankFrame{border-radius:18px;overflow:hidden;border:1px solid var(--line);margin-bottom:4px}
.oceanTank{position:relative;width:100%;overflow:hidden;
  background:linear-gradient(180deg,#0b3350 0%,#0d4666 40%,#12587a 70%,#1c6a86 100%)}
.oceanRays{position:absolute;inset:0;opacity:.16;
  background:repeating-linear-gradient(100deg,rgba(255,255,255,.5) 0 2px,transparent 2px 60px);
  mix-blend-mode:overlay;pointer-events:none}
.oceanFloorBed{position:absolute;left:0;right:0;bottom:0;height:64px;
  background:linear-gradient(180deg,#d8c48a 0%,#c2aa66 60%,#a8905a 100%);
  border-top-left-radius:50% 18px;border-top-right-radius:50% 18px}
.oceanDirt{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 100%,rgba(90,80,30,.55) 0%,rgba(60,70,40,.25) 45%,transparent 75%);
  transition:opacity .6s ease}
.fishLayer{position:absolute;top:0;left:0;width:100%;height:80%}
.oceanFish{position:absolute;will-change:transform}
.oceanFishBob{animation:oceanBob 2.6s ease-in-out infinite}
@keyframes oceanBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.coralWrap{position:absolute;left:50%;bottom:58px;transform-origin:bottom center;transition:transform .7s cubic-bezier(.34,1.4,.64,1)}
.algaeLayer{position:absolute;inset:0;pointer-events:none}
.oceanAlgae{position:absolute;bottom:64px;width:6px;border-radius:3px;
  background:linear-gradient(180deg,#6a8a3a,#3f5c22);transform-origin:bottom center;animation:oceanSway 3.5s ease-in-out infinite}
@keyframes oceanSway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
.debrisLayer{position:absolute;inset:0;pointer-events:none}
.oceanDebris{position:absolute;bottom:66px}
.oceanCaption{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:10.5px;color:rgba(255,255,255,.75);margin:0}
`}</style>;
}

/* ============================================================
   ROOT — PIN gate wraps the app; see components/PinGate.jsx and
   ARCHITECTURE.md §7 for why (remembered device, no repeated prompts).
   ============================================================ */
export default function App() {
  return (
    <PinGate>
      <LarderApp />
    </PinGate>
  );
}

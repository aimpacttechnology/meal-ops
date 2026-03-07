"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Meal Ops Board v1.1 (Green Ops Theme)
 * - 7-day lunch + dinner generator
 * - Rotation logic: weekly themes + avoid repeats windows
 * - Auto grocery list: sums quantities based on servings
 * - Anti-inflammatory scoring (ingredient -> meal -> week)
 * - "Dad-style Ops Board" dashboard KPIs + batch-cook suggestions
 *
 * NOTE: Planning tool only, not medical advice.
 */

// -----------------------
// Supplements
// -----------------------
const SUPPLEMENTS = {
  libido: [
    {
      name: "Ashwagandha (KSM-66)",
      dose: "300–600 mg",
      timing: "Morning or evening with food",
      note: "Adaptogen — lowers cortisol, supports testosterone & sexual function."
    },
    {
      name: "Zinc",
      dose: "25–40 mg",
      timing: "With dinner (not on empty stomach)",
      note: "Essential for testosterone synthesis. Most common deficiency in active men."
    },
    {
      name: "Maca Root",
      dose: "1.5–3 g",
      timing: "Morning with food",
      note: "Peruvian adaptogen with clinical evidence for libido and energy."
    },
    {
      name: "Vitamin D3 + K2",
      dose: "3,000–5,000 IU D3 / 100 mcg K2",
      timing: "With largest meal (fat improves absorption)",
      note: "Critical co-factor for testosterone. K2 directs calcium properly."
    },
    {
      name: "Tongkat Ali",
      dose: "200–400 mg (standardised extract)",
      timing: "Morning, away from food",
      note: "Supports free testosterone by reducing SHBG. Cycle 5 days on / 2 off."
    },
    {
      name: "L-Arginine",
      dose: "3–6 g",
      timing: "30 min before activity or on empty stomach",
      note: "Nitric oxide precursor — improves blood flow and arousal response."
    }
  ],
  gut: [
    {
      name: "Omega-3 (EPA/DHA)",
      dose: "2–4 g total EPA+DHA",
      timing: "With any meal containing fat",
      note: "Strongest evidence for reducing systemic inflammation. Amplifies fish in your diet."
    },
    {
      name: "Probiotics (multi-strain)",
      dose: "20–50 billion CFU",
      timing: "Morning on empty stomach or just before bed",
      note: "Lactobacillus + Bifidobacterium mix. Supports microbiome diversity alongside diet."
    },
    {
      name: "L-Glutamine",
      dose: "5–10 g",
      timing: "First thing AM on empty stomach",
      note: "Primary fuel for gut lining cells — tightens leaky gut and reduces permeability."
    },
    {
      name: "Curcumin (BCM-95 or + Piperine)",
      dose: "500–1,000 mg",
      timing: "With meals",
      note: "Bioavailable turmeric extract. Stacks with dietary turmeric for stronger anti-inflammatory effect."
    },
    {
      name: "Magnesium Glycinate",
      dose: "300–400 mg",
      timing: "Evening, 1 hr before bed",
      note: "Anti-inflammatory, aids gut motility, improves sleep quality and recovery."
    },
    {
      name: "Digestive Enzymes",
      dose: "1–2 capsules",
      timing: "With each main meal",
      note: "Supports protein and fat breakdown — reduces bloat and maximises nutrient extraction."
    },
    {
      name: "Quercetin",
      dose: "500–1,000 mg",
      timing: "With meals",
      note: "Flavonoid antioxidant — reduces gut inflammation, stabilises mast cells, pairs well with Omega-3."
    }
  ]
};

// -----------------------
// Theme / Rotation
// -----------------------
const THEMES = [
  { key: "med", name: "Mediterranean", flavors: ["lemon-herb", "olive-garlic", "tahini"] },
  { key: "mex", name: "Mex", flavors: ["taco", "chipotle-lime", "avocado-cilantro"] },
  { key: "asian", name: "Asian-ish", flavors: ["ginger-garlic", "coconut-curry", "tamari-sesame"] },
  { key: "comfort", name: "Comfort Clean", flavors: ["bbq-clean", "herby", "mustard-dill"] }
];

// Ingredient scoring: +2 strong anti-inflammatory, +1 good, 0 neutral, -1 caution, -2 avoid
// Flags power dietary filters.
const INGREDIENTS = {
  // Proteins
  salmon: { label: "Salmon", score: +2, flags: { glutenFree: true, dairyFree: true } },
  sardines: { label: "Sardines", score: +2, flags: { glutenFree: true, dairyFree: true } },
  chickenThighs: { label: "Chicken thighs", score: +1, flags: { glutenFree: true, dairyFree: true } },
  groundTurkey: { label: "Ground turkey", score: +1, flags: { glutenFree: true, dairyFree: true } },
  grassBeef: { label: "Grass-fed beef", score: +1, flags: { glutenFree: true, dairyFree: true } },
  eggs: { label: "Eggs", score: 0, flags: { glutenFree: true, dairyFree: true } },
  shrimp: { label: "Shrimp", score: +1, flags: { glutenFree: true, dairyFree: true } },
  lentils: { label: "Lentils", score: +1, flags: { glutenFree: true, dairyFree: true } },

  // Veg
  spinach: { label: "Spinach", score: +2, flags: { glutenFree: true, dairyFree: true } },
  broccoli: { label: "Broccoli", score: +2, flags: { glutenFree: true, dairyFree: true } },
  zucchini: { label: "Zucchini", score: +1, flags: { glutenFree: true, dairyFree: true } },
  asparagus: { label: "Asparagus", score: +1, flags: { glutenFree: true, dairyFree: true } },
  cabbage: { label: "Cabbage", score: +1, flags: { glutenFree: true, dairyFree: true } },
  peppers: { label: "Bell peppers", score: 0, flags: { glutenFree: true, dairyFree: true, nightshade: true } },
  mushrooms: { label: "Mushrooms", score: +1, flags: { glutenFree: true, dairyFree: true } },
  greenBeans: { label: "Green beans", score: +1, flags: { glutenFree: true, dairyFree: true } },
  sweetPotato: { label: "Sweet potato", score: +1, flags: { glutenFree: true, dairyFree: true } },
  cauliflowerRice: { label: "Cauliflower rice", score: +1, flags: { glutenFree: true, dairyFree: true } },
  onions: { label: "Onions", score: +1, flags: { glutenFree: true, dairyFree: true } },
  garlic: { label: "Garlic", score: +2, flags: { glutenFree: true, dairyFree: true } },
  tomatoes: { label: "Tomatoes", score: 0, flags: { glutenFree: true, dairyFree: true, nightshade: true } },

  // Fats / extras
  oliveOil: { label: "Olive oil", score: +2, flags: { glutenFree: true, dairyFree: true } },
  avocado: { label: "Avocado", score: +2, flags: { glutenFree: true, dairyFree: true } },
  walnuts: { label: "Walnuts", score: +1, flags: { glutenFree: true, dairyFree: true } },
  chia: { label: "Chia seeds", score: +1, flags: { glutenFree: true, dairyFree: true } },

  // Flavor / pantry
  turmeric: { label: "Turmeric", score: +2, flags: { glutenFree: true, dairyFree: true } },
  ginger: { label: "Ginger", score: +2, flags: { glutenFree: true, dairyFree: true } },
  tamari: { label: "Tamari (GF)", score: +1, flags: { glutenFree: true, dairyFree: true } },
  coconutMilk: { label: "Coconut milk", score: +1, flags: { glutenFree: true, dairyFree: true } },
  tahini: { label: "Tahini", score: +1, flags: { glutenFree: true, dairyFree: true } },

  // Items to avoid (optional)
  dairy: { label: "Dairy", score: -1, flags: { glutenFree: true, dairyFree: false } },
  gluten: { label: "Gluten", score: -2, flags: { glutenFree: false, dairyFree: true } },
  seedOil: { label: "Seed oil", score: -2, flags: { glutenFree: true, dairyFree: true, seedOil: true } }
};

// Templates for meals: each returns a title + grocery-ish items.
const MEAL_TEMPLATES = [
  // Lunch templates
  {
    id: "l1",
    type: "lunch",
    name: "Protein Bowl",
    prep: "med",
    build: ({ protein, veg1, veg2, flavor }) => ({
      title: `${label(protein)} bowl with ${label(veg1)} + ${label(veg2)} (${flavorLabel(flavor)})`,
      items: [
        qty(protein, 0.35, "lb"),
        qty(veg1, 2, "cup"),
        qty(veg2, 2, "cup"),
        qty("oliveOil", 1, "tbsp"),
        ...flavorItems(flavor)
      ]
    })
  },
  {
    id: "l2",
    type: "lunch",
    name: "Soup & Greens",
    prep: "easy",
    build: ({ protein, veg1, veg2, flavor }) => ({
      title: `${label(protein)} veggie soup + side greens (${flavorLabel(flavor)})`,
      items: [
        qty(protein, 0.3, "lb"),
        qty(veg1, 2, "cup"),
        qty(veg2, 1.5, "cup"),
        qty("onions", 0.5, "cup"),
        qty("garlic", 2, "clove"),
        qty("oliveOil", 1, "tbsp"),
        ...flavorItems(flavor)
      ]
    })
  },
  {
    id: "l3",
    type: "lunch",
    name: "Lettuce Wraps",
    prep: "easy",
    build: ({ protein, veg1, veg2, flavor }) => ({
      title: `${label(protein)} lettuce wraps with ${label(veg1)} + ${label(veg2)} (${flavorLabel(flavor)})`,
      items: [
        qty(protein, 0.33, "lb"),
        qty(veg1, 1.5, "cup"),
        qty(veg2, 1.5, "cup"),
        qty("avocado", 0.5, "each"),
        ...flavorItems(flavor)
      ]
    })
  },

  // Dinner templates
  {
    id: "d1",
    type: "dinner",
    name: "Sheet Pan",
    prep: "med",
    build: ({ protein, veg1, veg2, flavor }) => ({
      title: `Sheet-pan ${label(protein)} with ${label(veg1)} + ${label(veg2)} (${flavorLabel(flavor)})`,
      items: [
        qty(protein, 0.45, "lb"),
        qty(veg1, 2.5, "cup"),
        qty(veg2, 2.5, "cup"),
        qty("oliveOil", 1.5, "tbsp"),
        ...flavorItems(flavor)
      ]
    })
  },
  {
    id: "d2",
    type: "dinner",
    name: "Stir Fry",
    prep: "med",
    build: ({ protein, veg1, veg2, flavor }) => ({
      title: `${label(protein)} stir-fry with ${label(veg1)} + ${label(veg2)} (${flavorLabel(flavor)})`,
      items: [
        qty(protein, 0.45, "lb"),
        qty(veg1, 2.5, "cup"),
        qty(veg2, 2, "cup"),
        qty("garlic", 2, "clove"),
        qty("ginger", 1, "tbsp"),
        qty("oliveOil", 1, "tbsp"),
        ...(flavor === "tamari-sesame" ? [qty("tamari", 2, "tbsp")] : []),
        ...flavorItems(flavor)
      ]
    })
  },
  {
    id: "d3",
    type: "dinner",
    name: "Coconut Curry",
    prep: "med",
    build: ({ protein, veg1, veg2 }) => ({
      title: `Coconut curry ${label(protein)} with ${label(veg1)} + ${label(veg2)}`,
      items: [
        qty(protein, 0.45, "lb"),
        qty(veg1, 2.5, "cup"),
        qty(veg2, 2, "cup"),
        qty("coconutMilk", 0.75, "can"),
        qty("turmeric", 1, "tsp"),
        qty("ginger", 1, "tbsp"),
        qty("garlic", 2, "clove"),
        qty("oliveOil", 1, "tbsp")
      ]
    })
  }
];

// Pools
const PROTEINS = ["salmon", "sardines", "chickenThighs", "groundTurkey", "grassBeef", "eggs", "shrimp", "lentils"];
const VEG = ["spinach", "broccoli", "zucchini", "asparagus", "cabbage", "peppers", "mushrooms", "greenBeans", "sweetPotato", "cauliflowerRice", "tomatoes", "onions", "garlic"];

const FLAVOR_SETS = {
  "lemon-herb": ["oliveOil", "garlic"],
  "olive-garlic": ["oliveOil", "garlic"],
  "tahini": ["tahini", "garlic"],
  "taco": ["avocado"],
  "chipotle-lime": ["avocado"],
  "avocado-cilantro": ["avocado"],
  "ginger-garlic": ["ginger", "garlic"],
  "coconut-curry": ["coconutMilk", "turmeric", "ginger"],
  "tamari-sesame": ["tamari", "ginger", "garlic"],
  "bbq-clean": ["oliveOil"],
  "herby": ["oliveOil", "garlic"],
  "mustard-dill": ["oliveOil"]
};

// -----------------------
// Helpers
// -----------------------
function label(key) {
  return INGREDIENTS[key]?.label ?? key;
}
function qty(ingredientKey, amount, unit) {
  return { ingredientKey, amount, unit };
}
function flavorLabel(flavor) {
  return (flavor ?? "").replaceAll("-", " ");
}
function flavorItems(flavor) {
  const list = FLAVOR_SETS[flavor] ?? [];
  return list.map((k) => {
    if (k === "oliveOil") return qty("oliveOil", 0.5, "tbsp");
    if (k === "garlic") return qty("garlic", 1, "clove");
    if (k === "ginger") return qty("ginger", 0.5, "tbsp");
    if (k === "tamari") return qty("tamari", 1, "tbsp");
    if (k === "tahini") return qty("tahini", 1, "tbsp");
    if (k === "avocado") return qty("avocado", 0.25, "each");
    if (k === "coconutMilk") return qty("coconutMilk", 0.25, "can");
    if (k === "turmeric") return qty("turmeric", 0.5, "tsp");
    return qty(k, 1, "unit");
  });
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function weekKeyFromDate(dateISO) {
  const d = new Date(dateISO);
  const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(t / (7 * 24 * 60 * 60 * 1000));
}
function uniquePick(pool, usedSet, maxTries = 25) {
  for (let i = 0; i < maxTries; i++) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!usedSet.has(pick)) return pick;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
function filterIngredientsByRules(keys, rules) {
  return keys.filter((k) => {
    const ing = INGREDIENTS[k];
    if (!ing) return false;
    if (rules.excludeGluten && ing.flags?.glutenFree === false) return false;
    if (rules.excludeDairy && ing.flags?.dairyFree === false) return false;
    if (rules.excludeNightshades && ing.flags?.nightshade) return false;
    if (rules.excludeSeedOils && ing.flags?.seedOil) return false;
    return true;
  });
}

// score 0..10 (higher is better)
function scoreMeal(meal) {
  const raw = meal.items.reduce((acc, it) => acc + (INGREDIENTS[it.ingredientKey]?.score ?? 0), 0);
  const scaled = clamp(Math.round((raw + 6) * 1.2), 0, 10);
  return scaled;
}

function scoreBadgeClass(score) {
  if (score >= 8) return "badge good";
  if (score >= 4) return "badge warn";
  return "badge bad";
}

function estimatePrepLoad(meals) {
  let load = 0;
  for (const m of meals) {
    load += m.templatePrep === "easy" ? 1 : 2;
    if (m.items.length > 8) load += 1;
  }
  return clamp(load, 0, 10);
}

function aggregateGroceryList(plan, servings) {
  const map = new Map();
  for (const day of plan) {
    for (const slot of ["lunch", "dinner"]) {
      const meal = day[slot];
      if (!meal) continue;
      for (const it of meal.items) {
        const key = it.ingredientKey;
        const amount = it.amount * servings;
        const unit = it.unit;

        const existing = map.get(key);
        if (!existing) map.set(key, { ingredientKey: key, amount, unit });
        else {
          if (existing.unit === unit) {
            existing.amount += amount;
            map.set(key, existing);
          } else {
            const altKey = `${key}__${unit}`;
            const ex2 = map.get(altKey);
            if (!ex2) map.set(altKey, { ingredientKey: key, amount, unit });
            else {
              ex2.amount += amount;
              map.set(altKey, ex2);
            }
          }
        }
      }
    }
  }

  const proteinsSet = new Set(PROTEINS);
  const vegSet = new Set(VEG);

  return Array.from(map.values()).sort((a, b) => {
    const aType = proteinsSet.has(a.ingredientKey) ? 2 : vegSet.has(a.ingredientKey) ? 1 : 3;
    const bType = proteinsSet.has(b.ingredientKey) ? 2 : vegSet.has(b.ingredientKey) ? 1 : 3;
    if (aType !== bType) return aType - bType;
    return label(a.ingredientKey).localeCompare(label(b.ingredientKey));
  });
}

function formatAmount(a) {
  const rounded = Math.round(a * 100) / 100;
  return String(rounded);
}

function topOffenders(plan) {
  const counts = new Map();
  for (const day of plan) {
    for (const slot of ["lunch", "dinner"]) {
      const meal = day[slot];
      if (!meal) continue;
      for (const it of meal.items) {
        const s = INGREDIENTS[it.ingredientKey]?.score ?? 0;
        if (s <= 0) counts.set(it.ingredientKey, (counts.get(it.ingredientKey) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, c]) => ({ k, c, score: INGREDIENTS[k]?.score ?? 0 }));
}

function batchCookSuggestions(plan) {
  const proteinCounts = new Map();
  const vegCounts = new Map();

  for (const day of plan) {
    for (const slot of ["lunch", "dinner"]) {
      const meal = day[slot];
      if (!meal) continue;
      const keys = meal.items.map((i) => i.ingredientKey);
      for (const p of PROTEINS) if (keys.includes(p)) proteinCounts.set(p, (proteinCounts.get(p) ?? 0) + 1);
      for (const v of VEG) if (keys.includes(v)) vegCounts.set(v, (vegCounts.get(v) ?? 0) + 1);
    }
  }

  const topProteins = Array.from(proteinCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const topVeg = Array.from(vegCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const suggestions = [];
  if (topProteins.length) suggestions.push(`Batch-cook ${topProteins.map(([k]) => label(k)).join(" + ")} (2-day carryover)`);
  if (topVeg.length) suggestions.push(`Roast a tray of ${topVeg.map(([k]) => label(k)).join(", ")} for quick add-ons`);
  suggestions.push("Make one sauce jar (tahini or ginger-garlic) to re-skin meals fast");
  suggestions.push("Prep chopped onions/garlic once, then “deploy” nightly");
  return suggestions.slice(0, 4);
}

// -----------------------
// Generator
// -----------------------
function buildMeal({ type, theme, rules, avoidProteinSet, avoidMainTitleSet }) {
  const themeObj = THEMES.find((t) => t.key === theme) ?? THEMES[0];
  const allowedProteins = filterIngredientsByRules(PROTEINS, rules);
  const allowedVeg = filterIngredientsByRules(VEG, rules);

  const templatePool = MEAL_TEMPLATES.filter((t) => t.type === type);
  const template = templatePool[Math.floor(Math.random() * templatePool.length)];
  const flavor = themeObj.flavors[Math.floor(Math.random() * themeObj.flavors.length)];

  const protein = uniquePick(allowedProteins, avoidProteinSet);
  const vegUsed = new Set([protein]);
  const veg1 = uniquePick(allowedVeg, vegUsed);
  vegUsed.add(veg1);
  const veg2 = uniquePick(allowedVeg, vegUsed);

  const built = template.build({ protein, veg1, veg2, flavor });

  const meal = {
    id: `${type}-${Math.random().toString(16).slice(2)}`,
    type,
    templateId: template.id,
    templateName: template.name,
    templatePrep: template.prep,
    theme: themeObj.name,
    title: built.title,
    items: built.items
  };

  if (avoidMainTitleSet.has(meal.title)) {
    const protein2 = uniquePick(allowedProteins, new Set([...avoidProteinSet, protein]));
    const vegA = uniquePick(allowedVeg, new Set([protein2]));
    const vegB = uniquePick(allowedVeg, new Set([protein2, vegA]));
    const built2 = template.build({ protein: protein2, veg1: vegA, veg2: vegB, flavor });
    meal.title = built2.title;
    meal.items = built2.items;
  }

  meal.score = scoreMeal(meal);
  return meal;
}

function generateWeekPlan({ startDateISO, rules, repeatWindowProtein, repeatWindowTitle }) {
  const weekIndex = weekKeyFromDate(startDateISO);
  const theme = THEMES[weekIndex % THEMES.length].key;

  const proteinHistory = [];
  const titleHistory = [];
  const plan = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDateISO);
    date.setDate(date.getDate() + i);
    const dateISO = date.toISOString().slice(0, 10);

    const avoidProteinSet = new Set(proteinHistory.slice(-repeatWindowProtein));
    const avoidMainTitleSet = new Set(titleHistory.slice(-repeatWindowTitle));

    const lunch = buildMeal({ type: "lunch", theme, rules, avoidProteinSet, avoidMainTitleSet });
    for (const it of lunch.items) if (PROTEINS.includes(it.ingredientKey)) proteinHistory.push(it.ingredientKey);
    titleHistory.push(lunch.title);

    const avoidProteinSet2 = new Set(proteinHistory.slice(-repeatWindowProtein));
    const avoidMainTitleSet2 = new Set(titleHistory.slice(-repeatWindowTitle));

    const dinner = buildMeal({ type: "dinner", theme, rules, avoidProteinSet: avoidProteinSet2, avoidMainTitleSet: avoidMainTitleSet2 });
    for (const it of dinner.items) if (PROTEINS.includes(it.ingredientKey)) proteinHistory.push(it.ingredientKey);
    titleHistory.push(dinner.title);

    plan.push({ dayIndex: i, dateISO, lunch, dinner });
  }

  return { themeKey: theme, plan };
}

// -----------------------
// UI
// -----------------------
export default function Page() {
  const [startDate, setStartDate] = useState(todayISO());
  const [servings, setServings] = useState(2);

  const [rules, setRules] = useState({
    excludeGluten: true,
    excludeDairy: false,
    excludeNightshades: false,
    excludeSeedOils: true
  });

  const [repeatWindowProtein, setRepeatWindowProtein] = useState(4);
  const [repeatWindowTitle, setRepeatWindowTitle] = useState(4);

  const [state, setState] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("meal-ops-state");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });

  useEffect(() => {
    if (!state) {
      const wk = generateWeekPlan({ startDateISO: startDate, rules, repeatWindowProtein, repeatWindowTitle });
      setState({ ...wk, startDate, servings, rules, repeatWindowProtein, repeatWindowTitle });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state) return;
    window.localStorage.setItem("meal-ops-state", JSON.stringify(state));
  }, [state]);

  const plan = state?.plan ?? [];

  const themeName = useMemo(() => {
    const t = THEMES.find((x) => x.key === state?.themeKey);
    return t?.name ?? "Rotation";
  }, [state?.themeKey]);

  const groceryList = useMemo(() => aggregateGroceryList(plan, servings), [plan, servings]);

  const weekScoreAvg = useMemo(() => {
    if (!plan.length) return 0;
    const scores = plan.flatMap((d) => [d.lunch.score, d.dinner.score]);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 10) / 10;
  }, [plan]);

  const prepLoad = useMemo(() => estimatePrepLoad(plan.flatMap((d) => [d.lunch, d.dinner])), [plan]);
  const offenders = useMemo(() => topOffenders(plan), [plan]);
  const batch = useMemo(() => batchCookSuggestions(plan), [plan]);

  function regenerate() {
    const wk = generateWeekPlan({ startDateISO: startDate, rules, repeatWindowProtein, repeatWindowTitle });
    setState({ ...wk, startDate, servings, rules, repeatWindowProtein, repeatWindowTitle });
  }

  function swapMeal(dayIndex, slot) {
    if (!state) return;
    const theme = state.themeKey;
    const planCopy = structuredClone(state.plan);

    const recentMeals = planCopy.slice(Math.max(0, dayIndex - 2), dayIndex).flatMap((d) => [d.lunch, d.dinner]);

    const proteinHistory = [];
    const titleHistory = [];

    for (const m of recentMeals) {
      titleHistory.push(m.title);
      for (const it of m.items) if (PROTEINS.includes(it.ingredientKey)) proteinHistory.push(it.ingredientKey);
    }

    const newMeal = buildMeal({
      type: slot,
      theme,
      rules,
      avoidProteinSet: new Set(proteinHistory.slice(-repeatWindowProtein)),
      avoidMainTitleSet: new Set(titleHistory.slice(-repeatWindowTitle))
    });

    planCopy[dayIndex][slot] = newMeal;
    setState({ ...state, plan: planCopy });
  }

  function toggleRule(key) {
    setRules((r) => ({ ...r, [key]: !r[key] }));
  }

  // Keep state fields synced for persistence
  useEffect(() => {
    if (!state) return;
    setState((s) =>
      s
        ? {
            ...s,
            startDate,
            servings,
            rules,
            repeatWindowProtein,
            repeatWindowTitle
          }
        : s
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, servings, rules, repeatWindowProtein, repeatWindowTitle]);

  const readiness = useMemo(() => {
    const health = clamp(Math.round((weekScoreAvg / 10) * 10), 0, 10);
    const executionRisk = prepLoad;
    return clamp(Math.round(health - executionRisk * 0.35 + 4), 0, 10);
  }, [weekScoreAvg, prepLoad]);

  const readinessClass = readiness >= 7 ? "badge good" : readiness >= 5 ? "badge warn" : "badge bad";

  return (
    <div style={styles.shell}>
      <style>{css}</style>

      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Meal Ops Board</h1>
            <div style={styles.sub}>
              7-day lunch/dinner rotation • Auto grocery list • Anti-inflammatory scoring • Dad-grade execution dashboard
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={styles.btn} onClick={regenerate}>Regenerate Week</button>
            <button
              style={styles.btnSecondary}
              onClick={() => {
                window.localStorage.removeItem("meal-ops-state");
                const wk = generateWeekPlan({ startDateISO: startDate, rules, repeatWindowProtein, repeatWindowTitle });
                setState({ ...wk, startDate, servings, rules, repeatWindowProtein, repeatWindowTitle });
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div style={styles.grid3}>
          {/* OPS BOARD */}
          <div className="card">
            <div className="cardTitle">Ops Board</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <span className="pill">
                Theme: <b>{themeName}</b>
              </span>
              <span className={readinessClass}>Readiness {readiness}/10</span>
              <span className={scoreBadgeClass(Math.round(weekScoreAvg))}>Avg Score {weekScoreAvg}</span>
            </div>

            <div style={styles.kpiGrid}>
              <div className="kpiBox">
                <div className="kpiLabel">Prep Load</div>
                <div className="kpiValue">{prepLoad}/10</div>
                <div className="kpiHint">Lower is easier to execute.</div>
              </div>
              <div className="kpiBox">
                <div className="kpiLabel">Total Meals</div>
                <div className="kpiValue">{plan.length ? plan.length * 2 : 0}</div>
                <div className="kpiHint">Lunch + Dinner</div>
              </div>
              <div className="kpiBox">
                <div className="kpiLabel">Servings</div>
                <div className="kpiValue">{servings}</div>
                <div className="kpiHint">Used for grocery totals.</div>
              </div>
              <div className="kpiBox">
                <div className="kpiLabel">Rules</div>
                <div className="kpiValue">{Object.values(rules).filter(Boolean).length}</div>
                <div className="kpiHint">Active dietary filters.</div>
              </div>
            </div>

            <div className="sep" />

            <div className="sectionLabel">Batch Cook Suggestions</div>
            <ul style={{ margin: "8px 0 0 18px", color: "rgba(255,255,255,0.86)", fontSize: 13 }}>
              {batch.map((s, idx) => (
                <li key={idx} style={{ marginBottom: 6 }}>{s}</li>
              ))}
            </ul>

            <div className="sep" />

            <div className="sectionLabel">Caution / Neutral Ingredients Showing Up</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              {offenders.length === 0 ? (
                <span style={{ color: "rgba(255,255,255,0.70)" }}>None detected.</span>
              ) : (
                offenders.map((o) => (
                  <span key={o.k} className="pill">
                    {label(o.k)} <b>x{o.c}</b>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* CONTROLS */}
          <div className="card">
            <div className="cardTitle">Controls</div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div className="sectionLabel">Week Start</div>
                <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div className="sectionLabel">Servings</div>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={8}
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  style={{ width: 120 }}
                />
              </div>
            </div>

            <div className="sectionLabel">Dietary Filters</div>
            <div style={styles.grid2}>
              <label className="check">
                <input type="checkbox" checked={rules.excludeGluten} onChange={() => toggleRule("excludeGluten")} />
                Gluten-free
              </label>
              <label className="check">
                <input type="checkbox" checked={rules.excludeSeedOils} onChange={() => toggleRule("excludeSeedOils")} />
                No seed oils
              </label>
              <label className="check">
                <input type="checkbox" checked={rules.excludeDairy} onChange={() => toggleRule("excludeDairy")} />
                Dairy-free (trial)
              </label>
              <label className="check">
                <input type="checkbox" checked={rules.excludeNightshades} onChange={() => toggleRule("excludeNightshades")} />
                No nightshades
              </label>
            </div>

            <div className="sep" />

            <div className="sectionLabel">Rotation Logic</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div className="sectionLabel">Avoid repeating proteins (last N picks)</div>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={12}
                  value={repeatWindowProtein}
                  onChange={(e) => setRepeatWindowProtein(Number(e.target.value))}
                  style={{ width: 220 }}
                />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <div className="sectionLabel">Avoid repeating titles (last N meals)</div>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={12}
                  value={repeatWindowTitle}
                  onChange={(e) => setRepeatWindowTitle(Number(e.target.value))}
                  style={{ width: 220 }}
                />
              </div>
            </div>

            <button style={styles.btn} onClick={regenerate}>Generate with current rules</button>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              Tip: Start stricter (GF + no seed oils + dairy-free trial), then relax one at a time if symptoms improve.
            </div>
          </div>

          {/* GROCERY */}
          <div className="card">
            <div className="cardTitle">Grocery List</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
              Auto-summed from the plan × servings.
            </div>

            <div style={{ maxHeight: 520, overflow: "auto", marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {groceryList.map((g, idx) => (
                    <tr key={idx}>
                      <td>{label(g.ingredientKey)}</td>
                      <td style={{ color: "rgba(255,255,255,0.72)" }}>
                        {formatAmount(g.amount)} {g.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sep" />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
              Pro move: shop produce twice weekly (Day 1 and Day 4) for fresher greens.
            </div>
          </div>
        </div>

        {/* SUPPLEMENTS */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="cardTitle">Supplement Stack</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", marginBottom: 14 }}>
            Targeted to support libido, hormonal balance, and anti-inflammatory gut health. Not medical advice — consult a clinician before starting.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Libido */}
            <div>
              <div style={styles.suppHeader}>
                <span style={styles.suppDot} />
                Libido &amp; Hormonal Support
              </div>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Supplement</th>
                    <th>Dose</th>
                    <th>Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {SUPPLEMENTS.libido.map((s) => (
                    <tr key={s.name}>
                      <td>
                        <div style={{ fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{s.note}</div>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "#a78bfa" }}>{s.dose}</td>
                      <td style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>{s.timing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gut / Anti-inflammatory */}
            <div>
              <div style={styles.suppHeader}>
                <span style={{ ...styles.suppDot, background: "#34d399" }} />
                Anti-Inflammatory Gut Health
              </div>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Supplement</th>
                    <th>Dose</th>
                    <th>Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {SUPPLEMENTS.gut.map((s) => (
                    <tr key={s.name}>
                      <td>
                        <div style={{ fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{s.note}</div>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "#34d399" }}>{s.dose}</td>
                      <td style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>{s.timing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sep" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="pill">Priority starts: <b>Omega-3, Vitamin D3, Zinc, Probiotics</b></span>
            <span className="pill">Add adaptogens (Ashwagandha, Tongkat Ali) once base is dialled in</span>
            <span className="pill">Take Magnesium PM — it stacks with sleep for gut repair</span>
          </div>
        </div>

        {/* PLAN TABLE */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="cardTitle">Weekly Plan</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
            Swap any meal to keep variety and avoid ruts.
          </div>

          <div style={{ overflow: "auto", marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Date</th>
                  <th>Lunch</th>
                  <th style={{ width: 90 }}>Score</th>
                  <th>Dinner</th>
                  <th style={{ width: 90 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((d) => (
                  <tr key={d.dateISO}>
                    <td style={{ color: "rgba(255,255,255,0.72)" }}>
                      <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.88)" }}>{d.dateISO}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{themeName}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 800 }}>{d.lunch.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                        {d.lunch.items.slice(0, 6).map((it) => label(it.ingredientKey)).join(" • ")}
                        {d.lunch.items.length > 6 ? " • …" : ""}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button style={styles.btnSecondary} onClick={() => swapMeal(d.dayIndex, "lunch")}>Swap Lunch</button>
                      </div>
                    </td>
                    <td><span className={scoreBadgeClass(d.lunch.score)}>{d.lunch.score}</span></td>

                    <td>
                      <div style={{ fontWeight: 800 }}>{d.dinner.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                        {d.dinner.items.slice(0, 6).map((it) => label(it.ingredientKey)).join(" • ")}
                        {d.dinner.items.length > 6 ? " • …" : ""}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button style={styles.btnSecondary} onClick={() => swapMeal(d.dayIndex, "dinner")}>Swap Dinner</button>
                      </div>
                    </td>
                    <td><span className={scoreBadgeClass(d.dinner.score)}>{d.dinner.score}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sep" />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="pill">Scoring: <b>0–10</b> (higher = more anti-inflammatory leaning)</span>
            <span className="pill">Rotation: <b>Theme</b> changes each week automatically</span>
            <span className="pill">Swap: uses recent history to avoid repeats</span>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
          Disclaimer: This tool is for planning and organization, not medical advice. If symptoms are severe or persistent,
          consider a clinician-guided elimination/reintroduction approach.
        </div>
      </div>
    </div>
  );
}

// -----------------------
// Styling (Green Ops theme)
// -----------------------
const styles = {
  shell: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 800px at 20% 20%, rgba(34,197,94,0.22), transparent 55%)," +
      "radial-gradient(900px 700px at 80% 30%, rgba(16,185,129,0.16), transparent 55%)," +
      "radial-gradient(1000px 800px at 60% 90%, rgba(96,165,250,0.10), transparent 55%)," +
      "#0b1220"
  },
  container: { maxWidth: 1200, margin: "0 auto", padding: 18 },
  header: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, margin: "6px 0 14px", flexWrap: "wrap" },
  h1: { margin: 0, fontSize: 22, letterSpacing: 0.4 },
  sub: { color: "rgba(255,255,255,0.72)", fontSize: 13 },
  grid3: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "1.2fr 1.2fr 0.9fr"
  },
  kpiGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 },
  btn: {
    background: "linear-gradient(180deg, rgba(34,197,94,0.28), rgba(34,197,94,0.14))",
    border: "1px solid rgba(34,197,94,0.35)",
    color: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    padding: "9px 12px",
    cursor: "pointer"
  },
  btnSecondary: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    padding: "9px 12px",
    cursor: "pointer"
  },
  suppHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 800,
    color: "rgba(255,255,255,0.80)",
    textTransform: "uppercase",
    letterSpacing: 0.35
  },
  suppDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#a78bfa",
    flexShrink: 0
  }
};

// responsive tweak for smaller screens
const css = `
  .card{
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.20);
    backdrop-filter: blur(8px);
  }
  .cardTitle{
    font-size: 13px;
    color: rgba(255,255,255,0.70);
    font-weight: 800;
    letter-spacing: 0.35px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .pill{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    padding: 8px 10px;
    font-size: 13px;
    color: rgba(255,255,255,0.72);
  }
  .pill b{ color: rgba(255,255,255,0.92); }
  .kpiBox{
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 14px;
    padding: 10px;
  }
  .kpiLabel{ color: rgba(255,255,255,0.60); font-size: 12px; }
  .kpiValue{ font-size: 18px; margin-top: 3px; font-weight: 900; color: rgba(255,255,255,0.92); }
  .kpiHint{ font-size: 12px; color: rgba(255,255,255,0.58); margin-top: 2px; }
  .sectionLabel{ font-size: 12px; color: rgba(255,255,255,0.62); }
  .sep{ border-top: 1px solid rgba(255,255,255,0.10); margin: 12px 0; }
  .input{
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    color: rgba(255,255,255,0.92);
    padding: 9px 10px;
    outline: none;
  }
  .check{
    display:flex;
    align-items:center;
    gap:10px;
    padding: 9px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.05);
    cursor: pointer;
    user-select: none;
    font-size: 13px;
    color: rgba(255,255,255,0.86);
  }
  .check input{ transform: scale(1.1); }
  .table{
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 12px;
  }
  .table th, .table td{
    text-align: left;
    padding: 10px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
    vertical-align: top;
    font-size: 13px;
  }
  .table th{
    color: rgba(255,255,255,0.60);
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 0.25px;
    text-transform: uppercase;
  }
  .badge{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    min-width:44px;
    padding:4px 10px;
    border-radius:999px;
    border:1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    font-weight: 900;
    font-size: 13px;
  }
  .badge.good{
    color: #34d399;
    border-color: rgba(52,211,153,0.40);
    background: rgba(52,211,153,0.12);
    box-shadow: 0 0 0 1px rgba(52,211,153,0.08) inset;
  }
  .badge.warn{
    color: #fbbf24;
    border-color: rgba(251,191,36,0.40);
    background: rgba(251,191,36,0.12);
  }
  .badge.bad{
    color: #fb7185;
    border-color: rgba(251,113,133,0.40);
    background: rgba(251,113,133,0.12);
  }

  @media (max-width: 980px){
    .grid3 { grid-template-columns: 1fr !important; }
    .suppGrid { grid-template-columns: 1fr !important; }
  }
`;

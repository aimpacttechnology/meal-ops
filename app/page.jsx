"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

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
  vitality: [
    {
      name: "Ashwagandha (KSM-66)",
      dose: "300–600 mg",
      timing: "Morning or evening with food",
      note: "Adaptogen — reduces cortisol, supports sustained energy, restful sleep, and overall hormonal balance."
    },
    {
      name: "Vitamin B12 (Methylcobalamin)",
      dose: "500–1,000 mcg",
      timing: "Morning with or without food",
      note: "Powers cellular energy production and nerve function. Low B12 is a leading driver of fatigue and brain fog."
    },
    {
      name: "Saffron Extract (Affron)",
      dose: "28–30 mg",
      timing: "Morning or evening with food",
      note: "Clinically studied for mood elevation, reduced anxiety, and mental clarity. Gentle and well-tolerated."
    },
    {
      name: "Magnesium Glycinate",
      dose: "300–400 mg",
      timing: "Evening, 1 hr before bed",
      note: "Promotes deep sleep, reduces stress-driven fatigue, and supports calm nervous system function."
    },
    {
      name: "Vitamin D3 + K2",
      dose: "3,000–5,000 IU D3 / 100 mcg K2",
      timing: "With largest meal (fat improves absorption)",
      note: "Foundation supplement for energy, immune resilience, and hormonal health. K2 directs calcium properly."
    },
    {
      name: "Zinc",
      dose: "25–40 mg",
      timing: "With dinner (not on empty stomach)",
      note: "Supports hormonal balance, immune function, and physical vitality. One of the most common deficiencies."
    },
    {
      name: "Maca Root",
      dose: "1.5–3 g",
      timing: "Morning with food",
      note: "Peruvian adaptogen — boosts stamina, mental drive, and overall sense of wellbeing."
    },
    {
      name: "Tongkat Ali",
      dose: "200–400 mg (standardised extract)",
      timing: "Morning, away from food",
      note: "Supports free testosterone and physical energy levels. Cycle 5 days on / 2 off."
    },
    {
      name: "L-Arginine",
      dose: "3–6 g",
      timing: "30 min before activity or on empty stomach",
      note: "Nitric oxide precursor — promotes healthy circulation, physical performance, and cardiovascular energy."
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
  sardines: { label: "Sardines", score: +2, unit: "can", perServing: 1, flags: { glutenFree: true, dairyFree: true } },
  chickenThighs: { label: "Chicken thighs", score: +1, flags: { glutenFree: true, dairyFree: true } },
  groundTurkey: { label: "Ground turkey", score: +1, flags: { glutenFree: true, dairyFree: true } },
  grassBeef: { label: "Grass-fed beef", score: +1, flags: { glutenFree: true, dairyFree: true } },
  eggs: { label: "Eggs", score: 0, unit: "each", perServing: 3, flags: { glutenFree: true, dairyFree: true } },
  shrimp: { label: "Shrimp", score: +1, flags: { glutenFree: true, dairyFree: true } },
  lentils: { label: "Lentils", score: +1, unit: "cup", perServing: 0.5, flags: { glutenFree: true, dairyFree: true } },

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
  onions: { label: "Onions", score: +1, flags: { glutenFree: true, dairyFree: true, pantry: true } },
  garlic: { label: "Garlic", score: +2, flags: { glutenFree: true, dairyFree: true, pantry: true } },
  tomatoes: { label: "Tomatoes", score: 0, flags: { glutenFree: true, dairyFree: true, nightshade: true } },

  // Fats / extras
  oliveOil: { label: "Olive oil", score: +2, flags: { glutenFree: true, dairyFree: true, pantry: true } },
  avocado: { label: "Avocado", score: +2, flags: { glutenFree: true, dairyFree: true } },
  walnuts: { label: "Walnuts", score: +1, flags: { glutenFree: true, dairyFree: true } },
  chia: { label: "Chia seeds", score: +1, flags: { glutenFree: true, dairyFree: true } },

  // Flavor / pantry
  turmeric: { label: "Turmeric", score: +2, flags: { glutenFree: true, dairyFree: true, pantry: true } },
  ginger: { label: "Ginger", score: +2, flags: { glutenFree: true, dairyFree: true, pantry: true } },
  tamari: { label: "Tamari (GF)", score: +1, flags: { glutenFree: true, dairyFree: true, pantry: true } },
  coconutMilk: { label: "Coconut milk", score: +1, flags: { glutenFree: true, dairyFree: true } },
  tahini: { label: "Tahini", score: +1, flags: { glutenFree: true, dairyFree: true, pantry: true } },

  // Items to avoid (optional)
  dairy: { label: "Dairy", score: -1, flags: { glutenFree: true, dairyFree: false } },
  gluten: { label: "Gluten", score: -2, flags: { glutenFree: false, dairyFree: true } },
  seedOil: { label: "Seed oil", score: -2, flags: { glutenFree: true, dairyFree: true, seedOil: true } }
};

// -----------------------
// HEB Shopper Integration
// -----------------------
const HEB_META = {
  salmon:        { category: "seafood",       query: "salmon fillet skin-on",           targetSize: "lb" },
  sardines:      { category: "seafood",       query: "sardines canned in water",        targetSize: "can" },
  chickenThighs: { category: "meat",          query: "chicken thighs boneless skinless",targetSize: "lb" },
  groundTurkey:  { category: "meat",          query: "ground turkey 93% lean",          targetSize: "lb" },
  grassBeef:     { category: "meat",          query: "grass fed ground beef",           targetSize: "lb" },
  eggs:          { category: "dairy_eggs",    query: "large eggs",                      targetSize: "dozen", toQty: (n) => Math.ceil(n / 12) || 1 },
  shrimp:        { category: "seafood",       query: "shrimp large raw peeled deveined",targetSize: "lb" },
  lentils:       { category: "dry_goods",     query: "green or brown lentils",          targetSize: "lb bag" },
  spinach:       { category: "produce",       query: "baby spinach",                    targetSize: "5 oz bag", toQty: (n) => Math.ceil(n / 5) || 1 },
  broccoli:      { category: "produce",       query: "broccoli",                        targetSize: "head",     toQty: (n) => Math.ceil(n / 3) || 1 },
  zucchini:      { category: "produce",       query: "zucchini",                        targetSize: "each",     toQty: (n) => Math.ceil(n / 2) || 1 },
  asparagus:     { category: "produce",       query: "asparagus bunch",                 targetSize: "bunch",    toQty: (n) => Math.ceil(n / 4) || 1 },
  cabbage:       { category: "produce",       query: "green cabbage",                   targetSize: "head",     toQty: (n) => Math.ceil(n / 8) || 1 },
  peppers:       { category: "produce",       query: "bell peppers",                    targetSize: "each",     toQty: (n) => Math.ceil(n / 1.5) || 1 },
  mushrooms:     { category: "produce",       query: "white or cremini mushrooms",      targetSize: "8 oz pkg", toQty: (n) => Math.ceil(n / 3) || 1 },
  greenBeans:    { category: "produce",       query: "fresh green beans",               targetSize: "lb bag",   toQty: (n) => Math.ceil(n / 4) || 1 },
  sweetPotato:   { category: "produce",       query: "sweet potatoes",                  targetSize: "each",     toQty: (n) => Math.ceil(n / 2) || 1 },
  cauliflowerRice:{ category: "produce",      query: "cauliflower rice fresh or frozen",targetSize: "12 oz bag",toQty: (n) => Math.ceil(n / 3) || 1 },
  tomatoes:      { category: "produce",       query: "roma or vine tomatoes",           targetSize: "each",     toQty: (n) => Math.ceil(n / 1.5) || 1 },
  onions:        { category: "produce",       query: "yellow onion",                    targetSize: "each",     toQty: (n) => Math.ceil(n / 1) || 1 },
  garlic:        { category: "produce",       query: "garlic bulb",                     targetSize: "each",     toQty: (n) => Math.ceil(n / 10) || 1 },
  oliveOil:      { category: "pantry",        query: "extra virgin olive oil",          targetSize: "16 oz bottle" },
  avocado:       { category: "produce",       query: "hass avocado",                    targetSize: "each",     toQty: (n) => Math.ceil(n) || 1 },
  walnuts:       { category: "pantry",        query: "raw walnuts",                     targetSize: "8 oz bag" },
  chia:          { category: "pantry",        query: "chia seeds",                      targetSize: "12 oz bag" },
  turmeric:      { category: "pantry",        query: "ground turmeric",                 targetSize: "jar" },
  ginger:        { category: "pantry",        query: "fresh ginger root",               targetSize: "each" },
  tamari:        { category: "pantry",        query: "gluten free tamari soy sauce",    targetSize: "10 oz bottle" },
  coconutMilk:   { category: "pantry",        query: "coconut milk full fat can",       targetSize: "can" },
  tahini:        { category: "pantry",        query: "tahini sesame paste",             targetSize: "jar" }
};

function exportToHEBPlan(groceryList, servings, rules) {
  const dietNotes = [];
  if (rules.excludeGluten) dietNotes.push("gluten-free items only");
  if (rules.excludeDairy) dietNotes.push("dairy-free");
  if (rules.excludeNightshades) dietNotes.push("no nightshades");

  const items = groceryList
    .filter((g) => HEB_META[g.ingredientKey])
    .map((g) => {
      const meta = HEB_META[g.ingredientKey];
      const rawQty = meta.toQty ? meta.toQty(g.amount) : Math.ceil(g.amount * 10) / 10;
      return {
        category: meta.category,
        name: label(g.ingredientKey),
        query: meta.query,
        target_size: meta.targetSize,
        quantity: rawQty,
        notes: `${formatAmount(g.amount, g.unit)} ${g.unit} needed for ${servings} people`
      };
    });

  return {
    plan_version: "1.0",
    merchant: "HEB",
    generated_by: "Meal Ops Board",
    week_start: new Date().toISOString().slice(0, 10),
    fulfillment: {
      type: "curbside_or_delivery",
      store_selection: "ask_user_first",
      zip_fallback: "78701"
    },
    preferences: {
      prefer_store_brands: true,
      budget_mode: "good_value_not_ultra_premium",
      require_human_approval_before_checkout: true,
      units: "US",
      notes: dietNotes.length ? dietNotes : ["Anti-inflammatory diet — prioritise fresh and organic where available"]
    },
    substitutions_policy: {
      allow_brand_subs: true,
      allow_size_subs_within_percent: 25,
      must_confirm_price_delta_percent: 15,
      always_ask_for: ["salmon", "shrimp", "grassBeef"]
    },
    items
  };
}

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
const VEG = ["spinach", "broccoli", "zucchini", "asparagus", "cabbage", "peppers", "mushrooms", "greenBeans", "sweetPotato", "cauliflowerRice", "tomatoes"];

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
  const ing = INGREDIENTS[ingredientKey];
  if (ing?.unit) return { ingredientKey, amount: ing.perServing ?? amount, unit: ing.unit };
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
        const isPantry = INGREDIENTS[key]?.flags?.pantry;
        const amount = isPantry ? it.amount : it.amount * servings;
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

function formatAmount(a, unit) {
  // Discrete items — always whole, round up
  if (unit === "each" || unit === "can") return String(Math.ceil(a));
  // Cloves — whole number
  if (unit === "clove") return String(Math.round(a));
  // Pounds — round to nearest ¼ lb and show fractions
  if (unit === "lb") {
    const q = Math.round(a * 4) / 4;
    const whole = Math.floor(q);
    const frac = Math.round((q - whole) * 4);
    const fracStr = frac === 1 ? "¼" : frac === 2 ? "½" : frac === 3 ? "¾" : "";
    if (whole === 0) return fracStr || "¼";
    return fracStr ? `${whole} ${fracStr}` : String(whole);
  }
  // Cups — round to nearest ½
  if (unit === "cup") {
    const h = Math.round(a * 2) / 2;
    return h === Math.floor(h) ? String(h) : `${Math.floor(h)}½`;
  }
  // tbsp / tsp — round to 1 decimal, drop trailing zero
  const r = Math.round(a * 4) / 4;
  return r % 1 === 0 ? String(r) : String(+r.toFixed(2));
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
  const { isLoaded, isSignedIn } = useUser();
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

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [showShopPanel, setShowShopPanel] = useState(false);
  const [hebStatus, setHebStatus] = useState(null);
  const [instacartLoading, setInstacartLoading] = useState(false);
  const [instacartUrl, setInstacartUrl] = useState(null);
  const [instacartError, setInstacartError] = useState(null);
  const [showHEBAgent, setShowHEBAgent] = useState(false);

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
      generateWithAI();
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

  async function generateWithAI() {
    setAiLoading(true);
    setAiError(null);
    const themeKey = THEMES[weekKeyFromDate(startDate) % THEMES.length].key;
    try {
      const res = await fetch("/api/generate-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, servings, rules, themeKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "API error");

      const scoredPlan = data.plan.map((day) => ({
        ...day,
        lunch: { ...day.lunch, score: scoreMeal(day.lunch) },
        dinner: { ...day.dinner, score: scoreMeal(day.dinner) }
      }));

      setState({ plan: scoredPlan, themeKey, startDate, servings, rules, repeatWindowProtein, repeatWindowTitle, source: "ai" });
    } catch (err) {
      setAiError(err.message);
      const wk = generateWeekPlan({ startDateISO: startDate, rules, repeatWindowProtein, repeatWindowTitle });
      setState({ ...wk, startDate, servings, rules, repeatWindowProtein, repeatWindowTitle, source: "local" });
    } finally {
      setAiLoading(false);
    }
  }

  function regenerate() {
    generateWithAI();
  }

  async function swapMeal(dayIndex, slot) {
    if (!state) return;
    const planCopy = structuredClone(state.plan);

    const recentMeals = planCopy.slice(Math.max(0, dayIndex - 2), dayIndex).flatMap((d) => [d.lunch, d.dinner]);
    const avoidProteins = [];
    const avoidTitles = [];
    for (const m of recentMeals) {
      avoidTitles.push(m.title);
      for (const it of m.items) if (PROTEINS.includes(it.ingredientKey)) avoidProteins.push(it.ingredientKey);
    }

    try {
      const res = await fetch("/api/swap-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, themeKey: state.themeKey, rules, servings, avoidProteins, avoidTitles })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "API error");
      planCopy[dayIndex][slot] = { ...data.meal, score: scoreMeal(data.meal) };
    } catch {
      const newMeal = buildMeal({
        type: slot,
        theme: state.themeKey,
        rules,
        avoidProteinSet: new Set(avoidProteins.slice(-repeatWindowProtein)),
        avoidMainTitleSet: new Set(avoidTitles.slice(-repeatWindowTitle))
      });
      planCopy[dayIndex][slot] = newMeal;
    }

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

  async function shopOnInstacart() {
    setInstacartLoading(true);
    setInstacartUrl(null);
    setInstacartError(null);
    try {
      const res = await fetch("/api/instacart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groceryList,
          weekStart: startDate,
          appUrl: window.location.origin
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Instacart API error");
      setInstacartUrl(data.url);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setInstacartError(err.message);
    } finally {
      setInstacartLoading(false);
    }
  }

  function downloadHEBPlan() {
    const plan = exportToHEBPlan(groceryList, servings, rules);
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meal-ops-heb-${plan.week_start}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function sendToLocalAgent() {
    setHebStatus("sending");
    const plan = exportToHEBPlan(groceryList, servings, rules);
    try {
      const res = await fetch("http://localhost:8000/shopping/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grocery_plan: plan })
      });
      if (!res.ok) throw new Error(`Agent responded ${res.status}`);
      setHebStatus("success");
    } catch {
      setHebStatus("error");
    }
  }

  const readiness = useMemo(() => {
    const health = clamp(Math.round((weekScoreAvg / 10) * 10), 0, 10);
    const executionRisk = prepLoad;
    return clamp(Math.round(health - executionRisk * 0.35 + 4), 0, 10);
  }, [weekScoreAvg, prepLoad]);

  const readinessClass = readiness >= 7 ? "badge good" : readiness >= 5 ? "badge warn" : "badge bad";

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <div style={styles.shell}>
        <style>{css}</style>
        <div style={styles.landingWrap}>
          <h1 style={styles.landingTitle}>Meal Ops</h1>
          <p style={styles.landingSub}>AI-powered anti-inflammatory meal planning — 7-day plans, auto grocery lists, Instacart checkout.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
            <SignUpButton mode="modal">
              <button style={styles.btn}>Get Started — Free</button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button style={styles.btnSecondary}>Sign In</button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <style>{css}</style>

      {aiLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingBox}>
            <div className="spinnerRing" />
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
              AI is crafting your meal plan…
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 6 }}>
              Building 7 days of anti-inflammatory meals with real recipes
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
        {aiError && (
          <div style={styles.errorBanner}>
            ⚠ AI generation failed — showing locally generated plan. ({aiError})
          </div>
        )}
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Meal Ops Board</h1>
            <div style={styles.sub}>
              7-day lunch/dinner rotation • Auto grocery list • Anti-inflammatory scoring • Dad-grade execution dashboard
              {state?.source === "ai" && <span style={styles.aiBadge}>✦ AI-Powered</span>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
            <UserButton afterSignOutUrl="/" />
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div className="cardTitle" style={{ margin: 0 }}>Grocery List</div>
              <button
                style={styles.btnInstacart}
                onClick={() => { setShowShopPanel((v) => !v); setInstacartError(null); }}
              >
                🛒 Shop on Instacart
              </button>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
              Auto-summed from the plan × servings.
            </div>

            {showShopPanel && (
              <div style={styles.instacartPanel}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.95)" }}>
                    Shop on Instacart
                  </div>
                  <span style={styles.instacartBadge}>HEB • Whole Foods • 85,000+ stores</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 14, lineHeight: 1.6 }}>
                  Sends your full grocery list to Instacart — your customer picks their store,
                  marks pantry items they already have, and checks out. You earn 5% affiliate commission on every order.
                </div>

                {/* Primary CTA */}
                <button
                  style={instacartLoading ? styles.btnSecondary : styles.btnInstacartLarge}
                  onClick={shopOnInstacart}
                  disabled={instacartLoading}
                >
                  {instacartLoading ? "Building your cart…" : `Send ${groceryList.length} items to Instacart →`}
                </button>

                {/* Success state */}
                {instacartUrl && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: "#34d399", marginBottom: 6 }}>
                      ✓ Cart created! Link opens in a new tab.
                    </div>
                    <a
                      href={instacartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", wordBreak: "break-all" }}
                    >
                      {instacartUrl}
                    </a>
                  </div>
                )}

                {/* Error state */}
                {instacartError && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#fb7185" }}>
                    {instacartError.includes("not configured")
                      ? "API key not set yet — add INSTACART_API_KEY to .env.local when your key arrives."
                      : `Error: ${instacartError}`}
                  </div>
                )}

                {/* Divider — HEB local agent as secondary */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 14, paddingTop: 12 }}>
                  <button
                    style={{ ...styles.btnSecondary, fontSize: 11, padding: "6px 10px" }}
                    onClick={() => setShowHEBAgent((v) => !v)}
                  >
                    {showHEBAgent ? "▲ Hide" : "▼ Advanced"}: Local HEB Agent
                  </button>

                  {showHEBAgent && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", marginBottom: 8, lineHeight: 1.5 }}>
                        Run the strands-agent-shopper locally to automate HEB directly via browser extension.
                        Requires Python + AWS Bedrock.
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={styles.btnSecondary} onClick={downloadHEBPlan}>
                          Download grocery_plan.json
                        </button>
                        <button
                          style={hebStatus === "success" ? styles.btnActive : styles.btnSecondary}
                          onClick={sendToLocalAgent}
                          disabled={hebStatus === "sending"}
                        >
                          {hebStatus === "sending" ? "Sending…" : "Send to Local Agent (localhost:8000)"}
                        </button>
                      </div>
                      {hebStatus === "success" && (
                        <div style={{ fontSize: 12, color: "#34d399", marginTop: 8 }}>
                          ✓ Sent! The HEB extension will start shopping.
                        </div>
                      )}
                      {hebStatus === "error" && (
                        <div style={{ fontSize: 12, color: "#fb7185", marginTop: 8 }}>
                          Agent not reachable. Run <code style={{ background: "rgba(255,255,255,0.10)", padding: "1px 4px", borderRadius: 4 }}>python server.py</code> in the strands-agent-shopper folder first.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                        {formatAmount(g.amount, g.unit)} {g.unit}
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
            Targeted to support energy, mental health, sleep, and anti-inflammatory gut function. Not medical advice — consult a clinician before starting.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Libido */}
            <div>
              <div style={styles.suppHeader}>
                <span style={styles.suppDot} />
                Energy &amp; Mental Wellness
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
                  {SUPPLEMENTS.vitality.map((s) => (
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
            <span className="pill">Start here: <b>B12, Vitamin D3, Magnesium Glycinate, Omega-3</b></span>
            <span className="pill">Add Ashwagandha + Saffron for mood and sleep once the base is dialled in</span>
            <span className="pill">Magnesium PM + Saffron = powerful sleep and recovery combo</span>
            <span className="pill">Probiotics + L-Glutamine = gut lining repair foundation</span>
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
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <button style={styles.btnSecondary} onClick={() => swapMeal(d.dayIndex, "lunch")}>Swap</button>
                        {d.lunch.steps?.length > 0 && (
                          <button
                            style={expandedMealId === d.lunch.id ? styles.btnActive : styles.btnSecondary}
                            onClick={() => setExpandedMealId(expandedMealId === d.lunch.id ? null : d.lunch.id)}
                          >
                            {expandedMealId === d.lunch.id ? "Hide Recipe" : "Recipe"}
                          </button>
                        )}
                      </div>
                      {expandedMealId === d.lunch.id && d.lunch.steps?.length > 0 && (
                        <ol style={styles.stepsList}>
                          {d.lunch.steps.map((s, i) => <li key={i} style={styles.stepsItem}>{s}</li>)}
                        </ol>
                      )}
                    </td>
                    <td><span className={scoreBadgeClass(d.lunch.score)}>{d.lunch.score}</span></td>

                    <td>
                      <div style={{ fontWeight: 800 }}>{d.dinner.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                        {d.dinner.items.slice(0, 6).map((it) => label(it.ingredientKey)).join(" • ")}
                        {d.dinner.items.length > 6 ? " • …" : ""}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <button style={styles.btnSecondary} onClick={() => swapMeal(d.dayIndex, "dinner")}>Swap</button>
                        {d.dinner.steps?.length > 0 && (
                          <button
                            style={expandedMealId === d.dinner.id ? styles.btnActive : styles.btnSecondary}
                            onClick={() => setExpandedMealId(expandedMealId === d.dinner.id ? null : d.dinner.id)}
                          >
                            {expandedMealId === d.dinner.id ? "Hide Recipe" : "Recipe"}
                          </button>
                        )}
                      </div>
                      {expandedMealId === d.dinner.id && d.dinner.steps?.length > 0 && (
                        <ol style={styles.stepsList}>
                          {d.dinner.steps.map((s, i) => <li key={i} style={styles.stepsItem}>{s}</li>)}
                        </ol>
                      )}
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
  landingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24, textAlign: "center" },
  landingTitle: { fontSize: 48, fontWeight: 700, margin: "0 0 16px", letterSpacing: 1 },
  landingSub: { fontSize: 18, color: "rgba(255,255,255,0.72)", maxWidth: 500, margin: 0, lineHeight: 1.6 },
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
  btnInstacart: {
    background: "linear-gradient(180deg, rgba(0,175,80,0.32), rgba(0,175,80,0.16))",
    border: "1px solid rgba(0,175,80,0.50)",
    color: "rgba(255,255,255,0.95)",
    borderRadius: 12, padding: "7px 14px",
    cursor: "pointer", fontSize: 12, fontWeight: 800,
    letterSpacing: 0.2
  },
  btnInstacartLarge: {
    background: "linear-gradient(180deg, rgba(0,175,80,0.40), rgba(0,175,80,0.22))",
    border: "1px solid rgba(0,175,80,0.60)",
    color: "#fff",
    borderRadius: 14, padding: "12px 20px",
    cursor: "pointer", fontSize: 14, fontWeight: 800,
    width: "100%", textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,175,80,0.20)"
  },
  instacartPanel: {
    background: "rgba(0,175,80,0.06)",
    border: "1px solid rgba(0,175,80,0.22)",
    borderRadius: 14, padding: 16, marginTop: 12, marginBottom: 4
  },
  instacartBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
    color: "#4ade80",
    background: "rgba(0,175,80,0.15)",
    border: "1px solid rgba(0,175,80,0.30)",
    borderRadius: 999, padding: "2px 8px"
  },
  loadingOverlay: {
    position: "fixed", inset: 0, zIndex: 999,
    background: "rgba(11,18,32,0.88)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center"
  },
  loadingBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 20, padding: "32px 40px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.40)"
  },
  aiBadge: {
    marginLeft: 10,
    background: "linear-gradient(90deg, rgba(167,139,250,0.30), rgba(52,211,153,0.20))",
    border: "1px solid rgba(167,139,250,0.40)",
    borderRadius: 999, padding: "2px 10px",
    fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
    color: "#c4b5fd"
  },
  errorBanner: {
    background: "rgba(251,113,133,0.12)",
    border: "1px solid rgba(251,113,133,0.30)",
    borderRadius: 12, padding: "10px 14px",
    fontSize: 12, color: "#fb7185", marginBottom: 10
  },
  btnActive: {
    background: "linear-gradient(180deg, rgba(167,139,250,0.30), rgba(167,139,250,0.15))",
    border: "1px solid rgba(167,139,250,0.45)",
    color: "#c4b5fd",
    borderRadius: 12, padding: "9px 12px", cursor: "pointer"
  },
  stepsList: {
    margin: "10px 0 0 16px",
    padding: 0,
    borderLeft: "2px solid rgba(52,211,153,0.30)"
  },
  stepsItem: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12, lineHeight: 1.6,
    marginBottom: 6, paddingLeft: 8
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
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinnerRing {
    width: 40px; height: 40px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.10);
    border-top-color: #34d399;
    animation: spin 0.8s linear infinite;
  }
`;

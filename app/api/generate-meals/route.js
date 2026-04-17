import Anthropic from "@anthropic-ai/sdk";
import { auth, currentUser } from "@clerk/nextjs/server";

async function callOpenAI(prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0]?.message?.content ?? "";
}

const INGREDIENT_KEYS = {
  proteins: ["salmon", "sardines", "chickenThighs", "groundTurkey", "grassBeef", "eggs", "shrimp", "lentils"],
  vegetables: ["spinach", "broccoli", "zucchini", "asparagus", "cabbage", "peppers", "mushrooms", "greenBeans", "sweetPotato", "cauliflowerRice", "tomatoes"],
  pantry: ["oliveOil", "avocado", "walnuts", "chia", "turmeric", "ginger", "tamari", "coconutMilk", "tahini", "garlic", "onions"]
};

const ALL_VALID_KEYS = new Set([
  ...INGREDIENT_KEYS.proteins,
  ...INGREDIENT_KEYS.vegetables,
  ...INGREDIENT_KEYS.pantry
]);

const THEME_NAMES = {
  med: "Mediterranean — lean on lemon, olive oil, herbs, tahini, garlic",
  mex: "Mexican-inspired — avocado, lime, cumin vibes, fresh herbs",
  asian: "Asian-inspired — ginger, garlic, tamari, coconut milk, sesame",
  comfort: "Comfort Clean — herby, warming, mustard-dill, BBQ-clean flavors"
};

function buildPrompt({ startDate, servings, rules, themeKey, days }) {
  const dietaryNotes = [];
  if (rules.excludeGluten) dietaryNotes.push("strictly gluten-free");
  if (rules.excludeDairy) dietaryNotes.push("dairy-free");
  if (rules.excludeNightshades) dietaryNotes.push("no nightshades — exclude peppers and tomatoes");
  if (rules.excludeSeedOils) dietaryNotes.push("no seed oils");

  return `You are a precision anti-inflammatory meal planning AI. Generate a ${days}-day meal plan (lunch + dinner each day).

WEEKLY THEME: ${THEME_NAMES[themeKey] ?? THEME_NAMES.med}
DIETARY RULES: ${dietaryNotes.length ? dietaryNotes.join(", ") : "none"}
SERVINGS: ${servings} people
START DATE: ${startDate}

You MUST use ONLY these exact ingredient key names (camelCase, exact spelling):
- Proteins: ${INGREDIENT_KEYS.proteins.join(", ")}
- Vegetables: ${INGREDIENT_KEYS.vegetables.join(", ")}
- Pantry/Fats: ${INGREDIENT_KEYS.pantry.join(", ")}

Amount rules (amounts are PER SINGLE SERVING except pantry):
- salmon, shrimp, chickenThighs, groundTurkey, grassBeef → 0.4 lb per serving
- eggs → 3 each per serving
- sardines → 1 can per serving
- lentils → 0.5 cup per serving
- vegetables → 1.5 cup per serving each
- oliveOil → 1-2 tbsp total (pantry, not scaled)
- garlic → 2-4 clove total (pantry, not scaled)
- ginger → 1 tbsp total (pantry, not scaled)
- tahini, tamari → 1-2 tbsp total (pantry, not scaled)
- turmeric → 0.5-1 tsp total (pantry, not scaled)
- onions → 0.5-1 cup total (pantry, not scaled)
- avocado → 0.5 each per serving
- coconutMilk → 0.5 can per serving

Variety rules:
- Do NOT repeat the same protein more than twice across all ${days * 2} meals
- Every meal title must be unique and specific — not generic like "Protein Bowl"
- Lean into the weekly theme in both flavors and cooking style
- Lunch = lighter (1 protein, 2 veg, 2-3 pantry items)
- Dinner = heartier (1 protein, 2 veg, 3-4 pantry items)
- Steps must be practical, specific, and doable in a home kitchen (4-5 steps each)

Return ONLY valid JSON with no other text, markdown, or explanation:
{
  "plan": [
    {
      "dayIndex": 0,
      "lunch": {
        "title": "Descriptive creative meal title",
        "items": [
          {"ingredientKey": "salmon", "amount": 0.4, "unit": "lb"},
          {"ingredientKey": "spinach", "amount": 1.5, "unit": "cup"},
          {"ingredientKey": "broccoli", "amount": 1.5, "unit": "cup"},
          {"ingredientKey": "oliveOil", "amount": 1, "unit": "tbsp"},
          {"ingredientKey": "garlic", "amount": 2, "unit": "clove"}
        ],
        "steps": [
          "Preheat pan to medium-high. Pat salmon dry and season with salt and pepper.",
          "Sear salmon 4 minutes per side until golden. Rest 2 minutes.",
          "In same pan, sauté garlic in olive oil 30 seconds, add broccoli and spinach.",
          "Toss vegetables until just wilted, season to taste.",
          "Plate vegetables, top with flaked salmon."
        ]
      },
      "dinner": {
        "title": "Descriptive creative dinner title",
        "items": [...],
        "steps": [...]
      }
    }
  ]
}

Generate all ${days} days (dayIndex 0 through ${days - 1}).`;
}

function validateAndCleanPlan(raw, startDate, days) {
  if (!raw?.plan || !Array.isArray(raw.plan)) throw new Error("Invalid plan structure");

  return raw.plan.slice(0, days).map((day) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (day.dayIndex ?? 0));
    const dateISO = date.toISOString().slice(0, 10);

    const cleanMeal = (meal, type) => {
      const items = (meal.items ?? []).filter((it) => ALL_VALID_KEYS.has(it.ingredientKey));
      return {
        id: `${type}-ai-${day.dayIndex}`,
        type,
        templateName: "AI",
        templatePrep: type === "lunch" ? "easy" : "med",
        theme: "AI Generated",
        title: meal.title ?? `${type} meal`,
        items,
        steps: Array.isArray(meal.steps) ? meal.steps : []
      };
    };

    return {
      dayIndex: day.dayIndex ?? 0,
      dateISO,
      lunch: cleanMeal(day.lunch, "lunch"),
      dinner: cleanMeal(day.dinner, "dinner")
    };
  });
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const user = await currentUser();
  if (!user?.publicMetadata?.isPro) {
    return Response.json({ error: "Pro required", upgrade: true }, { status: 403 });
  }

  const { startDate, servings, rules, themeKey, days = 7 } = await request.json();

  const prompt = buildPrompt({ startDate, servings, rules, themeKey, days });
  let text = "";
  let source = "ai";

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }]
      });
      text = message.content[0]?.text ?? "";
      source = "anthropic";
    } catch (err) {
      console.warn("Anthropic failed, trying OpenAI fallback:", err.message);
    }
  }

  if (!text && process.env.OPENAI_API_KEY) {
    try {
      text = await callOpenAI(prompt);
      source = "openai";
    } catch (err) {
      console.error("OpenAI fallback also failed:", err.message);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (!text) {
    return Response.json({ error: "No AI provider available — set ANTHROPIC_API_KEY or OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const raw = JSON.parse(jsonMatch[0]);
    const plan = validateAndCleanPlan(raw, startDate, days);

    return Response.json({ plan, source });
  } catch (err) {
    console.error("generate-meals parse error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

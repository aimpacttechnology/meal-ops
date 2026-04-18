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
      max_tokens: 1024,
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

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const user = await currentUser();
  const meta = user?.publicMetadata ?? {};
  const proActive = meta.isPro && (!meta.proExpiresAt || meta.proExpiresAt > Date.now());
  if (!proActive) {
    return Response.json({ error: "Pro required", upgrade: true }, { status: 403 });
  }

  const { slot, themeKey, rules, servings, avoidProteins = [], avoidTitles = [] } = await request.json();

  const THEME_NAMES = {
    med: "Mediterranean (lemon, olive oil, herbs, tahini)",
    mex: "Mexican-inspired (avocado, lime, fresh herbs)",
    asian: "Asian-inspired (ginger, garlic, tamari, coconut milk)",
    comfort: "Comfort Clean (herby, warming, BBQ-clean)"
  };

  const dietaryNotes = [];
  if (rules.excludeGluten) dietaryNotes.push("gluten-free");
  if (rules.excludeDairy) dietaryNotes.push("dairy-free");
  if (rules.excludeNightshades) dietaryNotes.push("no peppers or tomatoes");
  if (rules.excludeSeedOils) dietaryNotes.push("no seed oils");

  const prompt = `Generate a single anti-inflammatory ${slot} meal.

THEME: ${THEME_NAMES[themeKey] ?? THEME_NAMES.med}
DIETARY RULES: ${dietaryNotes.length ? dietaryNotes.join(", ") : "none"}
SERVINGS: ${servings} people
${avoidProteins.length ? `AVOID these proteins (used recently): ${avoidProteins.join(", ")}` : ""}
${avoidTitles.length ? `AVOID these meal titles (used recently): ${avoidTitles.join("; ")}` : ""}

Use ONLY these exact ingredient keys:
- Proteins: ${INGREDIENT_KEYS.proteins.join(", ")}
- Vegetables: ${INGREDIENT_KEYS.vegetables.join(", ")}
- Pantry: ${INGREDIENT_KEYS.pantry.join(", ")}

Amounts (per serving except pantry):
- proteins: 0.4 lb (eggs: 3 each, sardines: 1 can, lentils: 0.5 cup)
- vegetables: 1.5 cup each
- pantry items are fixed totals (not per serving)

Return ONLY valid JSON, no other text:
{
  "title": "Creative specific meal title",
  "items": [
    {"ingredientKey": "salmon", "amount": 0.4, "unit": "lb"},
    {"ingredientKey": "spinach", "amount": 1.5, "unit": "cup"},
    {"ingredientKey": "broccoli", "amount": 1.5, "unit": "cup"},
    {"ingredientKey": "oliveOil", "amount": 1, "unit": "tbsp"},
    {"ingredientKey": "garlic", "amount": 2, "unit": "clove"}
  ],
  "steps": [
    "Step 1...",
    "Step 2...",
    "Step 3...",
    "Step 4..."
  ]
}`;

  let text = "";

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      });
      text = message.content[0]?.text ?? "";
    } catch (err) {
      console.warn("Anthropic failed, trying OpenAI fallback:", err.message);
    }
  }

  if (!text && process.env.OPENAI_API_KEY) {
    try {
      text = await callOpenAI(prompt);
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
    const items = (raw.items ?? []).filter((it) => ALL_VALID_KEYS.has(it.ingredientKey));

    return Response.json({
      meal: {
        id: `${slot}-ai-swap-${Date.now()}`,
        type: slot,
        templateName: "AI",
        templatePrep: slot === "lunch" ? "easy" : "med",
        theme: "AI Generated",
        title: raw.title ?? `${slot} meal`,
        items,
        steps: Array.isArray(raw.steps) ? raw.steps : []
      }
    });
  } catch (err) {
    console.error("swap-meal error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

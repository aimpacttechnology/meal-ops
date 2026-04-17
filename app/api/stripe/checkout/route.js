import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = request.headers.get("origin") ?? "https://meal-ops.vercel.app";

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [{ price: process.env.STRIPE_PRODUCT_ID, quantity: 1 }],
    mode: "subscription",
    success_url: `${origin}/?upgraded=true`,
    cancel_url: `${origin}/`,
    metadata: { clerkUserId: userId },
    subscription_data: { metadata: { clerkUserId: userId } }
  });

  return Response.json({ url: session.url });
}

import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";

const ADMIN_EMAIL = "landon@aimpacttechnology.com";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = await currentUser();
  const adminEmail = admin?.emailAddresses?.[0]?.emailAddress;
  if (adminEmail !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { email, days, revoke } = await request.json();
  if (!email) return Response.json({ error: "Email required" }, { status: 400 });

  const clerk = await clerkClient();
  const results = await clerk.users.getUserList({ emailAddress: [email] });
  const target = results.data?.[0];

  if (!target) {
    return Response.json({ error: `No user found with email: ${email}` }, { status: 404 });
  }

  if (revoke) {
    await clerk.users.updateUserMetadata(target.id, {
      publicMetadata: { isPro: false, proTrial: false, proExpiresAt: null }
    });
    return Response.json({ success: true, message: `Pro access revoked for ${email}` });
  }

  const proExpiresAt = days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;

  await clerk.users.updateUserMetadata(target.id, {
    publicMetadata: {
      isPro: true,
      proTrial: !false,
      proExpiresAt
    }
  });

  return Response.json({
    success: true,
    message: `Pro access granted to ${email}${days ? ` for ${days} days` : " permanently"}`
  });
}

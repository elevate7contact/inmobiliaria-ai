import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.unsafeMetadata?.role as string) ?? "SEARCHER";

    await client.users.updateUser(userId, {
      publicMetadata: { role },
    });

    return NextResponse.json({ ok: true, role });
  } catch (err) {
    console.error("set-role error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

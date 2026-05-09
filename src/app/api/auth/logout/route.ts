import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ message: "Sesión cerrada" });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

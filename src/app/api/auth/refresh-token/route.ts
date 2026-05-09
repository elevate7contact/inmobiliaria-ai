import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      return NextResponse.json(
        { error: "Sesión expirada. Inicia sesión de nuevo." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      expires_at: data.session.expires_at,
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

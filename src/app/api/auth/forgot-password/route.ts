import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const { email } = parsed.data;
    const adminClient = createAdminClient();

    // Generar link de recuperación desde Supabase Admin
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
      },
    });

    if (error) {
      console.error("generateLink error:", error);
      // No revelar si el email existe o no (seguridad)
      return NextResponse.json({ ok: true });
    }

    const resetLink = data.properties.action_link;

    // Enviar email via Resend REST API (sin SMTP)
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Chatinmuebles <onboarding@resend.dev>",
        to: [email],
        subject: "Restablece tu contraseña — Chatinmuebles",
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
            <h2 style="color:#1f2937;margin-top:0;">Restablecer contraseña</h2>
            <p style="color:#4b5563;">Recibiste este email porque solicitaste restablecer tu contraseña en <strong>Chatinmuebles</strong>.</p>
            <div style="margin:28px 0;">
              <a href="${resetLink}"
                 style="background:#4f46e5;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
                Restablecer contraseña
              </a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">Este link expira en 1 hora.<br>Si no solicitaste este cambio, podés ignorar este email.</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.json().catch(() => ({}));
      console.error("Resend error:", resendError);
      return NextResponse.json(
        { error: "Error al enviar el email de recuperación" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

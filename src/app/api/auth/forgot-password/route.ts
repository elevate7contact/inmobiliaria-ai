import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import nodemailer from "nodemailer";

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

    // 1. Generar link de recuperación (no envía email, solo crea el link)
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
      },
    });

    if (error) {
      console.error("generateLink error:", error.message);
      // Seguridad: no revelar si el email existe o no
      return NextResponse.json({ ok: true });
    }

    const resetLink = data.properties.action_link;

    // 2. Enviar email via Hotmail SMTP (nodemailer)
    const transporter = nodemailer.createTransport({
      host: "smtp-mail.outlook.com",
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Chatinmuebles" <${process.env.SMTP_USER}>`,
      to: email,
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
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("forgot-password error:", msg);
    return NextResponse.json(
      { error: "Error al enviar el email de recuperación" },
      { status: 500 }
    );
  }
}

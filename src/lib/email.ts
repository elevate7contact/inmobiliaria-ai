// src/lib/email.ts
// Emails transaccionales via Resend REST API (sin SDK).

const RESEND_API = "https://api.resend.com/emails";
const FROM = process.env.EMAIL_FROM ?? "VistaTour <onboarding@resend.dev>";
const ADMIN_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? "vistagpt@hotmail.com";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.vistatour.app";

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[email] RESEND_API_KEY missing");
      return;
    }
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[email] Resend error:", err);
    }
  } catch (err) {
    console.error("[email] send exception:", err);
  }
}

// ─────────────────────────────────────────────────────────
// Estilos compartidos
// ─────────────────────────────────────────────────────────
const wrapperOpen = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9fafb;">
  <div style="background:#ffffff;border-radius:12px;padding:32px 24px;">`;
const wrapperClose = `</div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
    VistaTour · plataforma de inmobiliarias verificadas
  </p>
</div>`;

function ctaButton(href: string, label: string): string {
  return `<div style="margin:28px 0;">
    <a href="${href}" style="background:#FF6B1A;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
      ${label}
    </a>
  </div>`;
}

// ─────────────────────────────────────────────────────────
// 1. Notificación admin: documentos recibidos
// ─────────────────────────────────────────────────────────
export async function sendDocsReceivedToAdmin(params: {
  companyName: string;
  companyPhone: string;
  userEmail: string;
  realtorId: string;
}): Promise<void> {
  const { companyName, companyPhone, userEmail, realtorId } = params;
  const subject = `Nueva inmobiliaria para verificar — ${companyName}`;
  const reviewUrl = `${APP_URL}/admin/realtors/${realtorId}/verify`;
  const html = `${wrapperOpen}
    <h2 style="color:#0A0A0A;margin:0 0 16px;font-size:20px;border-left:4px solid #FF6B1A;padding-left:12px;">
      Nueva inmobiliaria para verificar
    </h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">
      Una inmobiliaria acaba de completar la carga de documentos y está esperando revisión.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#0A0A0A;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:120px;">Empresa</td>
        <td style="padding:8px 0;font-weight:600;">${companyName}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Contacto</td>
        <td style="padding:8px 0;">${userEmail}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Teléfono</td>
        <td style="padding:8px 0;">${companyPhone}</td>
      </tr>
    </table>
    ${ctaButton(reviewUrl, "Revisar documentos →")}
  ${wrapperClose}`;
  await send(ADMIN_EMAIL, subject, html);
}

// ─────────────────────────────────────────────────────────
// 2. Aprobación al inmobiliario
// ─────────────────────────────────────────────────────────
export async function sendVerificationApproved(params: {
  to: string;
  name: string;
  companyName: string;
}): Promise<void> {
  const { to, name, companyName } = params;
  const greeting = name?.trim() ? `Hola ${name}` : "Hola";
  const subject = `${companyName} ya está verificada en VistaTour`;
  const html = `${wrapperOpen}
    <h2 style="color:#16a34a;margin:0 0 16px;font-size:22px;">
      Tu inmobiliaria está verificada
    </h2>
    <p style="color:#0A0A0A;margin:0 0 12px;font-size:15px;">
      ${greeting},
    </p>
    <p style="color:#4b5563;margin:0 0 20px;font-size:14px;line-height:1.6;">
      Revisamos los documentos de <strong>${companyName}</strong> y todo está en orden. Desde ahora aparecés como inmobiliaria verificada en VistaTour.
    </p>
    <ul style="list-style:none;padding:0;margin:0 0 16px;color:#0A0A0A;font-size:14px;">
      <li style="padding:8px 0;">
        <span style="display:inline-block;background:#16a34a;color:#ffffff;border-radius:50%;width:18px;height:18px;text-align:center;font-size:12px;line-height:18px;margin-right:8px;">✓</span>
        Badge verde visible en tu perfil
      </li>
      <li style="padding:8px 0;">
        <span style="display:inline-block;background:#16a34a;color:#ffffff;border-radius:50%;width:18px;height:18px;text-align:center;font-size:12px;line-height:18px;margin-right:8px;">✓</span>
        Mejor posicionamiento en búsquedas
      </li>
      <li style="padding:8px 0;">
        <span style="display:inline-block;background:#16a34a;color:#ffffff;border-radius:50%;width:18px;height:18px;text-align:center;font-size:12px;line-height:18px;margin-right:8px;">✓</span>
        Acceso completo a analytics
      </li>
    </ul>
    ${ctaButton(`${APP_URL}/dashboard`, "Ir al dashboard →")}
  ${wrapperClose}`;
  await send(to, subject, html);
}

// ─────────────────────────────────────────────────────────
// 3. Rechazo al inmobiliario
// ─────────────────────────────────────────────────────────
export async function sendVerificationRejected(params: {
  to: string;
  name: string;
  companyName: string;
  reason: string;
}): Promise<void> {
  const { to, name, companyName, reason } = params;
  const greeting = name?.trim() ? `Hola ${name}` : "Hola";
  const subject = `Sobre tu verificación en VistaTour — ${companyName}`;
  const html = `${wrapperOpen}
    <h2 style="color:#0A0A0A;margin:0 0 16px;font-size:20px;">
      Sobre tu verificación en VistaTour
    </h2>
    <p style="color:#0A0A0A;margin:0 0 12px;font-size:15px;">
      ${greeting},
    </p>
    <p style="color:#4b5563;margin:0 0 16px;font-size:14px;line-height:1.6;">
      Revisamos los documentos de <strong>${companyName}</strong> y por ahora no pudimos aprobar la verificación. Te dejamos el detalle:
    </p>
    <div style="background:#fef2f2;border-left:4px solid #DC2626;padding:14px 16px;border-radius:6px;margin:0 0 20px;color:#0A0A0A;font-size:14px;line-height:1.6;">
      ${reason}
    </div>
    <p style="color:#4b5563;margin:0 0 8px;font-size:14px;line-height:1.6;">
      Tranquilo, puedes subir los documentos corregidos cuando quieras y los volvemos a revisar.
    </p>
    ${ctaButton(`${APP_URL}/dashboard/verification`, "Subir documentos de nuevo →")}
  ${wrapperClose}`;
  await send(to, subject, html);
}

import { Resend } from "resend";
import type { MailerModel, ViewNotificationInput } from "../types/index";

const DEFAULT_FROM_ADDRESS = "Papershare <onboarding@resend.dev>";

const client = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function sendViewNotification(
  input: ViewNotificationInput,
): Promise<void> {
  if (process.env.NODE_ENV === "test" || !client) {
    return;
  }

  const linkDescription = input.linkLabel
    ? `o link "${input.linkLabel}"`
    : "seu link de compartilhamento";

  await client.emails.send({
    from: process.env.MAIL_FROM_ADDRESS ?? DEFAULT_FROM_ADDRESS,
    to: input.to,
    subject: `Seu documento "${input.documentTitle}" foi visualizado`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>Olá,</p>
        <p>
          ${linkDescription} do documento
          <strong>${input.documentTitle}</strong> foi aberto por um novo
          visitante.
        </p>
        <p>
          <a
            href="${input.analyticsUrl}"
            style="display: inline-block; padding: 10px 18px; background: #14181f; color: #ffffff; text-decoration: none; border-radius: 4px;"
          >
            Ver analytics
          </a>
        </p>
        <p style="color: #7a8090; font-size: 13px;">
          Você recebeu este e-mail porque é o dono deste documento no
          Papershare.
        </p>
      </div>
    `,
  });
}

const mailer: MailerModel = {
  sendViewNotification,
};

export default mailer;

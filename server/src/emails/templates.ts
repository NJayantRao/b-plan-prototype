export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const DEMO_NOTICE =
  "Magadh Ventures is a college/hackathon prototype using demo data. It is not a medical service.";

export const otpEmail = (firstName: string, otp: string): EmailContent => ({
  subject: "Your Magadh Ventures verification code",
  text: `Hi ${firstName},\n\nYour verification code is ${otp}. It is valid for 10 minutes.\n\nIf you did not request this, you can ignore this email.\n\n${DEMO_NOTICE}`,
  html: `<p>Hi ${escapeHtml(firstName)},</p>
<p>Your verification code is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${escapeHtml(otp)}</p>
<p>It is valid for 10 minutes. If you did not request this, you can ignore this email.</p>
<p style="color:#71717A;font-size:12px">${DEMO_NOTICE}</p>`,
});

export const welcomeEmail = (firstName: string): EmailContent => ({
  subject: "Welcome to Magadh Ventures",
  text: `Hi ${firstName},\n\nYour account has been verified. You can now complete your health profile.\n\n${DEMO_NOTICE}`,
  html: `<p>Hi ${escapeHtml(firstName)},</p>
<p>Your account has been verified. You can now complete your health profile.</p>
<p style="color:#71717A;font-size:12px">${DEMO_NOTICE}</p>`,
});

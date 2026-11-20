const nodemailer = require("nodemailer");

const emailUser = process.env.EMAIL_USER || process.env.email_user || process.env.SMTP_USER;
const emailPass = process.env.EMAIL_PASS || process.env.email_pass || process.env.SMTP_PASS;
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: emailUser, pass: emailPass },
});

function requireMailCredentials() {
  if (!emailUser || !emailPass) {
    throw new Error("Email is not configured. Set EMAIL_USER and EMAIL_PASS.");
  }
}

async function sendOtpEmail({ to, name, otp, purpose }) {
  requireMailCredentials();
  const isEmailVerification = purpose === "verify-email";
  const subject = isEmailVerification ? "Verify your TXO account" : "Your TXO sign-in code";
  const heading = isEmailVerification ? "Verify your email" : "Sign-in verification";
  return transporter.sendMail({
    from: `TXO Company <${emailUser}>`,
    to,
    subject,
    text: `Hello ${name}, your TXO verification code is ${otp}. It expires in 10 minutes.`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f7f5;padding:24px;color:#26342d"><div style="max-width:520px;margin:auto;background:#fff;padding:30px;border-radius:14px"><p style="color:#23755d;font-size:12px;font-weight:bold;letter-spacing:2px">TXO COMPANY</p><h2>${heading}</h2><p>Hello ${escapeHtml(name)},</p><p>Use this one-time code to ${isEmailVerification ? "verify your email address" : "sign in"}:</p><p style="padding:16px;background:#f0f7f2;border-radius:10px;text-align:center;font-size:30px;font-weight:bold;letter-spacing:8px;color:#195e49">${otp}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p><p>Regards,<br><b>TXO Team</b></p></div></body></html>`,
  });
}

async function sendQuotationEmail({ to, project, quotation, role }) {
  requireMailCredentials();
  const rows = quotation.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.description)}</td><td>₹${item.amount.toFixed(2)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="font-family:Arial;background:#f5f3ef;padding:24px"><div style="max-width:650px;margin:auto;background:white;padding:28px;border-radius:12px"><h2 style="color:#6b4423">Project quotation</h2><p>Hello,</p><p>Please find the quotation for <b>${escapeHtml(project.title)}</b>.</p><p>Confirmed requirement version: <b>v${quotation.version}</b></p><table width="100%" cellpadding="10" cellspacing="0" border="1" style="border-collapse:collapse"><tr><th align="left">Description</th><th align="left">Amount</th></tr>${rows}<tr><th align="left">Total</th><th align="left">₹${quotation.total.toFixed(2)}</th></tr></table><p>${escapeHtml(quotation.notes || "")}</p><p>Regards,<br><b>TXO Team</b><br>TXO Company</p></div></body></html>`;
  return transporter.sendMail({
    from: `TXO Company <${emailUser}>`,
    to,
    subject: `Quotation: ${project.title}`,
    html,
  });
}
function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
module.exports = { sendOtpEmail, sendQuotationEmail };

const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST;
const emailUser = smtpHost
  ? process.env.SMTP_USER || process.env.EMAIL_USER || process.env.email_user
  : process.env.EMAIL_USER || process.env.email_user || process.env.SMTP_USER;
const emailPass = smtpHost
  ? process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.email_pass
  : process.env.EMAIL_PASS || process.env.email_pass || process.env.SMTP_PASS;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE.toLowerCase() === "true"
  : smtpPort === 465;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: (process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

function requireMailCredentials() {
  if (!emailUser || !emailPass) {
    throw new Error("Email is not configured. Set EMAIL_USER and EMAIL_PASS.");
  }
  if (!smtpHost && !/@(gmail\.com|googlemail\.com)$/i.test(emailUser)) {
    throw new Error(
      "SMTP_HOST is required when using a non-Gmail email account.",
    );
  }
  if (
    smtpHost &&
    (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)
  ) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }
}

async function sendOtpEmail({ to, name, otp, purpose }) {
  requireMailCredentials();
  const isEmailVerification = purpose === "verify-email";
  const subject = isEmailVerification
    ? "Verify your TXO account"
    : "Your TXO sign-in code";
  const heading = isEmailVerification
    ? "Verify your email"
    : "Sign-in verification";
  return transporter.sendMail({
    from: `TXO Company <${emailUser}>`,
    to,
    subject,
    text: `Hello ${name}, your TXO verification code is ${otp}. It expires in 10 minutes.`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f7f5;padding:24px;color:#26342d"><div style="max-width:520px;margin:auto;background:#fff;padding:30px;border-radius:14px"><p style="color:#23755d;font-size:12px;font-weight:bold;letter-spacing:2px">TXO COMPANY</p><h2>${heading}</h2><p>Hello ${escapeHtml(name)},</p><p>Use this one-time code to ${isEmailVerification ? "verify your email address" : "sign in"}:</p><p style="padding:16px;background:#f0f7f2;border-radius:10px;text-align:center;font-size:30px;font-weight:bold;letter-spacing:8px;color:#195e49">${otp}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p><p>Regards,<br><b>TXO Team</b></p></div></body></html>`,
  });
}

async function sendQuotationEmail({
  to,
  recipientName,
  recipientRole,
  project,
  version,
  quotation,
}) {
  requireMailCredentials();
  const rows = quotation.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.description)}</td><td>₹${item.amount.toFixed(2)}</td></tr>`,
    )
    .join("");
  const safeProjectTitle = escapeHtml(project.title);
  const safeRecipientName = escapeHtml(recipientName || "there");
  const safeNotes = escapeHtml(quotation.notes || "");
  const safeClientName = escapeHtml(project.client?.name || "Not provided");
  const safeClientEmail = escapeHtml(project.client?.email || "Not provided");
  const safeDeveloperName = escapeHtml(
    project.developer?.name || "Not provided",
  );
  const safeDeveloperEmail = escapeHtml(
    project.developer?.email || "Not provided",
  );
  const developerDetailsHtml =
    recipientRole === "developer"
      ? `<br><b>Developer:</b> ${safeDeveloperName} (${safeDeveloperEmail})`
      : "";
  const safeProjectType = escapeHtml(project.websiteType || "Not provided");
  const safeProjectLevel = escapeHtml(project.level || "Not provided");
  const safeProjectDescription = escapeHtml(
    project.description || "Not provided",
  );
  const clientOffer = project.clientOffer
    ? `₹${Number(project.clientOffer.amount).toFixed(2)}`
    : "Not provided";
  const safeClientOfferNotes = escapeHtml(
    project.clientOffer?.notes || "Not provided",
  );
  const requirements = (version.snapshot || []).map((feature) => ({
    title: feature.title || "Untitled requirement",
    description: feature.description || "",
  }));
  const requirementsHtml = requirements.length
    ? requirements
        .map(
          (feature) =>
            `<li><b>${escapeHtml(feature.title)}</b>${feature.description ? ` - ${escapeHtml(feature.description)}` : ""}</li>`,
        )
        .join("")
    : "<li>No requirements were recorded for this version.</li>";
  const requirementsText = requirements.length
    ? requirements
        .map(
          (feature) =>
            `- ${feature.title}${feature.description ? ` - ${feature.description}` : ""}`,
        )
        .join("\n")
    : "- No requirements were recorded for this version.";
  const textItems = quotation.items
    .map((item) => `- ${item.description}: INR ${item.amount.toFixed(2)}`)
    .join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial;background:#f5f3ef;padding:24px"><div style="max-width:650px;margin:auto;background:white;padding:28px;border-radius:12px"><p>Hello ${safeRecipientName},</p><h2 style="color:#23755d">Project quotation</h2><h3>Project details</h3><p><b>Project:</b> ${safeProjectTitle}<br><b>Client:</b> ${safeClientName} (${safeClientEmail})${developerDetailsHtml}<br><b>Project type:</b> ${safeProjectType}<br><b>Project level:</b> ${safeProjectLevel}<br><b>Description:</b> ${safeProjectDescription}</p><p><b>Client's original budget:</b> ${clientOffer}<br><b>Client's budget notes:</b> ${safeClientOfferNotes}</p><h3>Confirmed requirements (version v${quotation.version})</h3><ul>${requirementsHtml}</ul><h3>Quotation amounts</h3><table width="100%" cellpadding="10" cellspacing="0" border="1" style="border-collapse:collapse"><tr><th align="left">Description</th><th align="left">Amount</th></tr>${rows}<tr><th align="left">Total</th><th align="left">₹${quotation.total.toFixed(2)}</th></tr></table><p>${safeNotes}</p><p>Regards,<br><b>TXO Team</b><br>TXO Company</p></div></body></html>`;
  const textProjectDetails = [
    `Project: ${project.title}`,
    `Client: ${project.client?.name || "Not provided"} (${project.client?.email || "Not provided"})`,
    ...(recipientRole === "developer"
      ? [
          `Developer: ${project.developer?.name || "Not provided"} (${project.developer?.email || "Not provided"})`,
        ]
      : []),
    `Project type: ${project.websiteType || "Not provided"}`,
    `Project level: ${project.level || "Not provided"}`,
    `Description: ${project.description || "Not provided"}`,
    `Client's original budget: ${clientOffer}`,
    `Client's budget notes: ${project.clientOffer?.notes || "Not provided"}`,
  ].join("\n");
  const info = await transporter.sendMail({
    from: `TXO Company <${emailUser}>`,
    to,
    subject: `Quotation: ${project.title}`,
    text: `Hello ${recipientName || "there"},\n\nProject details:\n${textProjectDetails}\n\nConfirmed requirements (version v${quotation.version}):\n${requirementsText}\n\nQuotation amounts:\n${textItems}\nTotal: INR ${quotation.total.toFixed(2)}${quotation.notes ? `\n\nQuotation notes: ${quotation.notes}` : ""}\n\nRegards,\nTXO Team`,
    html,
  });
  const acceptedAddresses = (info.accepted || []).map((recipient) =>
    typeof recipient === "string" ? recipient : recipient.address,
  );
  if (
    !acceptedAddresses.some(
      (address) => address?.toLowerCase() === to.toLowerCase(),
    )
  ) {
    throw new Error(
      `Mail server did not accept ${to}: ${info.response || "recipient rejected"}`,
    );
  }
  console.info("Quotation email accepted by SMTP", {
    recipient: to,
    messageId: info.messageId,
    response: info.response,
  });
  return { recipient: to, messageId: info.messageId };
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

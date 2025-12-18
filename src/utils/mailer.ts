import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER || "abhigadala2105@gmail.com",
    pass: process.env.SMTP_PASS || "oaze sguz nrnx gumd",
  },
});

export async function sendInviteMail(to: string, projectName: string, token: string, tempPassword?: string) {
  const appUrl = process.env.APP_URL || "http://localhost:5173"; // frontend
  const inviteUrl = `${appUrl}/invite/${token}`;

  const html = `
    <div style="font-family:Inter,Arial,sans-serif">
      <h2>You were invited to join <strong>${projectName}</strong></h2>
      <p>Click the button below to accept the invite and join the project.</p>
      <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:#fff;border-radius:6px;text-decoration:none">Accept invitation</a></p>
      <hr/>
      <p><strong>Temporary password:</strong> <code>${tempPassword}</code></p>
      <p>Use this password to login at <a href="${appUrl}">${appUrl}</a>. After logging in, we recommend you change your password.</p>
      <p>If you didn't expect this, ignore this email.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `TaskLync <${process.env.SMTP_USER}>`,
      to,
      subject: `Invite to join ${projectName}`,
      html,
    });
  } catch (err) {
    console.error("sendInviteMail failed", err);
    // do not throw — allow invite to be created even if email fails
  }
}

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email, password, slug) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing ENV: RESEND_API_KEY");
  }

  const loginLink = `${process.env.FRONTEND_URL}/login`;
  const audienceLink = `${process.env.FRONTEND_URL}/${slug}`;

  const { data, error } = await resend.emails.send({
    from: "Mentalism <onboarding@resend.dev>",
    to: email,
    subject: "Your Performer Access",
    html: `       <h2>Welcome Performer</h2>       <p>Your account has been created.</p>       <b>Email:</b> ${email}<br/>       <b>Password:</b> ${password}<br/><br/>       <b>Login:</b><br/>       <a href="${loginLink}">${loginLink}</a><br/><br/>       <b>Audience Link:</b><br/>       <a href="${audienceLink}">${audienceLink}</a>
    `,
  });

  if (error) {
    console.error("RESEND ERROR:", error);
    throw new Error(error.message || "Failed to send email");
  }

  console.log("EMAIL SENT:", data?.id || data);
}

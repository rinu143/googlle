import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email, password, slug) {
  const loginLink = `${process.env.FRONTEND_URL}/login`;
  const audienceLink = `${process.env.FRONTEND_URL}/${slug}`;

  await resend.emails.send({
    from: "Mentalism <onboarding@resend.dev>",
    to: email,
    subject: "Your Performer Access",
    html: `       <h2>Welcome Performer</h2>       <p>Your account has been created.</p>       <b>Email:</b> ${email}<br/>       <b>Password:</b> ${password}<br/><br/>       <b>Login:</b><br/>       <a href="${loginLink}">${loginLink}</a><br/><br/>       <b>Audience Link:</b><br/>       <a href="${audienceLink}">${audienceLink}</a>
    `,
  });
}

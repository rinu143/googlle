const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendWelcomeEmail(email, password, slug) {
  const loginLink = `${process.env.FRONTEND_URL}/login`;
  const audienceLink = `${process.env.FRONTEND_URL}/${slug}`;

  await transporter.sendMail({
    from: `"Mentalism Portal" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your Performer Access",
    html: ` <h2>Welcome Performer</h2> <p>Your account has been created.</p>

  <b>Email:</b> ${email}<br/>
  <b>Password:</b> ${password}<br/><br/>

  <b>Login:</b><br/>
  <a href="${loginLink}">${loginLink}</a><br/><br/>

  <b>Audience Link:</b><br/>
  <a href="${audienceLink}">${audienceLink}</a>
`,
  });
}

module.exports = sendWelcomeEmail;

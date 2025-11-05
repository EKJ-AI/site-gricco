import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to, subject, html) {
  const from = process.env.SMTP_FROM || 'IMAX <no-reply@imax.com>';
  
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  console.log(`✅ Email enviado: ${info.messageId}`);
}

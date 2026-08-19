import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const GMAIL_USER = process.env.GMAIL_USER || "mohamed701164@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";

export function createGmailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendEmailViaGmail({ to, subject, html }: SendEmailParams) {
  if (!GMAIL_APP_PASSWORD) {
    console.warn("[Gmail Fallback] GMAIL_APP_PASSWORD is not set in environment.");
  }
  const transporter = createGmailTransporter();
  const info = await transporter.sendMail({
    from: `"Vorder CRM" <${GMAIL_USER}>`,
    to,
    subject,
    html,
  });
  console.log("[Gmail Fallback] Email sent successfully:", info.messageId);
  return info;
}

export async function sendPasswordResetViaGmail(recipientEmail: string, actionUrl: string) {
  const subject = "إعادة تعيين كلمة المرور - منصة Vorder";
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif; background-color: #f8f9fa; color: #1a202c; margin: 0; padding: 20px; text-align: right; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .logo { font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 20px; text-align: center; }
        .title { font-size: 20px; font-weight: bold; color: #1a202c; margin-bottom: 12px; }
        .text { font-size: 14px; color: #4a5568; line-height: 1.6; margin-bottom: 24px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #059669; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px; }
        .footer { font-size: 12px; color: #a0aec0; text-align: center; margin-top: 32px; border-top: 1px solid #edf2f7; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">فوردَر | Vorder CRM</div>
        <div class="title">مرحباً بك،</div>
        <div class="text">لقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك المسجل لدى منصة Vorder. اضغط على الزر أدناه لإكمال عملية التغيير بأمان:</div>
        <div class="btn-container">
          <a href="${actionUrl}" class="btn" target="_blank">إعادة تعيين كلمة المرور الآن</a>
        </div>
        <div class="text" style="font-size: 12px; color: #718096;">إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة وسيبقى حسابك آمناً.</div>
        <div class="footer">جميع الحقوق محفوظة © منصة فوردَر Vorder CRM</div>
      </div>
    </body>
    </html>
  `;

  return sendEmailViaGmail({ to: recipientEmail, subject, html });
}

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Create Nodemailer transporter with Resend SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  secure: true,
  port: 465,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error.message);
  } else {
    console.log("✅ SMTP connection ready - emails can be sent");
  }
});

/**
 * Build a styled HTML welcome email
 */
function buildWelcomeEmailHTML(studentName, email, password, className) {
  const classRow = className
    ? `<tr>
        <td style="padding:8px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Class</td>
        <td style="padding:8px 16px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;">${className}</td>
       </tr>`
    : "";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background-color:#f0fdf4;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0fdf4;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 50%,#15803d 100%);padding:40px 32px;text-align:center;">
                <div style="font-size:36px;margin-bottom:8px;">🎓</div>
                <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Welcome to iQuizU!</h1>
                <p style="margin:8px 0 0;color:#bbf7d0;font-size:15px;">Your student account has been created</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                  Hi <strong>${studentName}</strong>,
                </p>
                <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                  Your teacher has created an iQuizU account for you. You can now log in and start taking quizzes!
                </p>

                <!-- Credentials Card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                  <tr>
                    <td colspan="2" style="background:#1e293b;padding:12px 16px;">
                      <span style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">🔐 Your Login Credentials</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;width:100px;">Email</td>
                    <td style="padding:12px 16px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Password</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
                      <code style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:0.5px;">${password}</code>
                    </td>
                  </tr>
                  ${classRow}
                </table>

                <!-- Login Button -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding:8px 0 24px;">
                      <a href="https://iquizu.online" 
                         style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                        Log In to iQuizU →
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Security Note -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:8px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                        ⚠️ <strong>Important:</strong> We recommend changing your password after your first login for security purposes.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">
                  This is an automated message from <strong>iQuizU</strong>. Please do not reply to this email.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

// ==================== ROUTES ====================

// Health check
app.get("/", (req, res) => {
  res.json({ message: "iQuizU Email Server", status: "running" });
});

// Send welcome email
app.post("/api/email/send-welcome", async (req, res) => {
  const { email, studentName, password, className } = req.body;

  if (!email || !studentName || !password) {
    return res.status(400).json({
      status: "error",
      message: "Missing required fields: email, studentName, password",
    });
  }

  try {
    const htmlContent = buildWelcomeEmailHTML(studentName, email, password, className || "");

    const info = await transporter.sendMail({
      from: "iQuizU <no-reply@iquizu.online>",
      to: email,
      subject: "Welcome to iQuizU! Your Account is Ready 🎓",
      text: `Hi ${studentName},\n\nYour iQuizU account has been created.\n\nEmail: ${email}\nPassword: ${password}\n${className ? `Class: ${className}\n` : ""}\nLog in at: https://iquizu.online\n\nPlease change your password after your first login.\n\n- iQuizU Team`,
      html: htmlContent,
    });

    console.log(`📧 Welcome email sent to ${email} (Message ID: ${info.messageId})`);

    res.json({
      status: "success",
      message: `Welcome email sent to ${email}`,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error.message);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 iQuizU Email Server running on http://localhost:${PORT}`);
  console.log(`📧 Using Resend SMTP (smtp.resend.com:465)`);
  console.log(`🔑 API Key: ${process.env.RESEND_API_KEY ? "configured ✅" : "MISSING ❌"}\n`);
});

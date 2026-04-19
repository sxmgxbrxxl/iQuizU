import os
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class WelcomeEmailRequest(BaseModel):
    email: str
    studentName: str
    password: str
    studentNo: Optional[str] = ""

class TeacherWelcomeEmailRequest(BaseModel):
    email: str
    password: str


def build_welcome_email_html(student_name: str, email: str, password: str, student_no: str) -> str:
    return f"""
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
              <tr>
                <td style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 50%,#15803d 100%);padding:40px 32px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">🎓</div>
                  <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Welcome to iQuizU!</h1>
                  <p style="margin:8px 0 0;color:#bbf7d0;font-size:15px;">Your student account has been created</p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                    Hi <strong>{student_name}</strong>,
                  </p>
                  <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                    Your teacher has created an iQuizU account for you. You can now log in and start taking quizzes!
                  </p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                    <tr>
                      <td colspan="2" style="background:#1e293b;padding:12px 16px;">
                        <span style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">🔐 Your Login Credentials</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;width:100px;">Student No.</td>
                      <td style="padding:12px 16px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;">{student_no}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Email</td>
                      <td style="padding:12px 16px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;">{email}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px;color:#64748b;font-size:14px;">Password</td>
                      <td style="padding:12px 16px;">
                        <code style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:0.5px;">{password}</code>
                      </td>
                    </tr>
                  </table>
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
    """

def build_teacher_welcome_email_html(email: str, password: str) -> str:
    return f"""
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
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5 0%,#4338ca 50%,#3730a3 100%);padding:40px 32px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">👨‍🏫</div>
                  <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Welcome to iQuizU!</h1>
                  <p style="margin:8px 0 0;color:#c7d2fe;font-size:15px;">Your teacher account has been created</p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                    Hi <strong>Teacher</strong>,
                  </p>
                  <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                    An administrator has created an iQuizU teacher account for you. You can now log in, create quizzes, and manage your classes!
                  </p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                    <tr>
                      <td colspan="2" style="background:#1e293b;padding:12px 16px;">
                        <span style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">🔐 Your Login Credentials</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;width:100px;">Email</td>
                      <td style="padding:12px 16px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;">{email}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px;color:#64748b;font-size:14px;">Password</td>
                      <td style="padding:12px 16px;">
                        <code style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:0.5px;">{password}</code>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" style="padding:8px 0 24px;">
                        <a href="https://iquizu.online"
                           style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#4338ca);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                          Log In to iQuizU →
                        </a>
                      </td>
                    </tr>
                  </table>
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
    """



@router.post("/send-welcome")
async def send_welcome_email(data: WelcomeEmailRequest):
    if not data.email or not data.studentName or not data.password:
        raise HTTPException(status_code=400, detail="Missing required fields")

    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY is not configured")

    html_content = build_welcome_email_html(
        data.studentName, data.email, data.password, data.studentNo or ""
    )
    plain_text = (
        f"Hi {data.studentName},\n\n"
        f"Your iQuizU account has been created.\n\n"
        f"Student No.: {data.studentNo}\n"
        f"Email: {data.email}\n"
        f"Password: {data.password}\n"
        f"Log in at: https://iquizu.online\n\n"
        f"Please change your password after your first login.\n\n"
        f"- iQuizU Team"
    )

    payload = {
        "from": "iQuizU <no-reply@iquizu.online>",
        "to": [data.email],
        "subject": "Welcome to iQuizU! Your Account is Ready 🎓",
        "html": html_content,
        "text": plain_text,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code in (200, 201):
            print(f"📧 Welcome email sent to {data.email}")
            return JSONResponse(content={
                "status": "success",
                "message": f"Welcome email sent to {data.email}"
            })
        else:
            error_detail = response.json() if response.content else {}
            print(f"❌ Resend API error: {response.status_code} - {error_detail}")
            raise HTTPException(status_code=502, detail=f"Resend API error: {error_detail}")

    except httpx.TimeoutException:
        print(f"❌ Timeout sending email to {data.email}")
        raise HTTPException(status_code=504, detail="Request timed out")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Failed to send email to {data.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-teacher-welcome")
async def send_teacher_welcome_email(data: TeacherWelcomeEmailRequest):
    if not data.email or not data.password:
        raise HTTPException(status_code=400, detail="Missing required fields")

    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY is not configured")

    html_content = build_teacher_welcome_email_html(data.email, data.password)
    plain_text = (
        f"Hi Teacher,\n\n"
        f"Your iQuizU administrator has created an account for you.\n\n"
        f"Email: {data.email}\n"
        f"Password: {data.password}\n"
        f"Log in at: https://iquizu.online\n\n"
        f"Please change your password after your first login.\n\n"
        f"- iQuizU Team"
    )

    payload = {
        "from": "iQuizU <no-reply@iquizu.online>",
        "to": [data.email],
        "subject": "Welcome to iQuizU! Your Teacher Account is Ready 👨‍🏫",
        "html": html_content,
        "text": plain_text,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code in (200, 201):
            print(f"📧 Teacher welcome email sent to {data.email}")
            return JSONResponse(content={
                "status": "success",
                "message": f"Teacher welcome email sent to {data.email}"
            })
        else:
            error_detail = response.json() if response.content else {}
            print(f"❌ Resend API error: {response.status_code} - {error_detail}")
            raise HTTPException(status_code=502, detail=f"Resend API error: {error_detail}")

    except httpx.TimeoutException:
        print(f"❌ Timeout sending email to {data.email}")
        raise HTTPException(status_code=504, detail="Request timed out")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Failed to send email to {data.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY")

FROM_EMAIL = "gogetters2026@gmail.com"  # or Resend default

def send_email(to_email: str, subject: str, body: str):
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": subject,
        "html": body.replace("\n", "<br>")
    })
    print(f"✅ Email sent to {to_email}")

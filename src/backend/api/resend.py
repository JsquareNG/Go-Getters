# import resend
# import os

# resend.api_key = os.getenv("RESEND_API_KEY")

# FROM_EMAIL = "onboarding@resend.dev"  # or Resend default

# def send_email(to_email: str, subject: str, body: str):
#     resend.Emails.send({
#         "from": FROM_EMAIL,
#         "to": to_email,
#         "subject": subject,
#         "html": body.replace("\n", "<br>")
#     })
#     print(f"✅ Email sent to {to_email}")

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = "gogetters2026@gmail.com"  # temporary

def send_email(to_email: str, subject: str, body: str):
    if not SENDGRID_API_KEY:
        raise RuntimeError("SENDGRID_API_KEY not set")

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        plain_text_content=body
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"✅ Email sent ({response.status_code}) to {to_email}")
    except Exception as e:
        print("❌ SendGrid email failed")
        raise e

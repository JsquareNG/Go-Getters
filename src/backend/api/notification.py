from backend.models.application import ApplicationForm
from backend.models.user import User


# Change to your URL 
WEBSITE_URL = "https://placeholder-bank.com"
INTERNAL_URL = "https://internal-placeholder-bank.com"

def build_account_created_email(user: User):
    subject = "Your Account Has Been Successfully Created"

    body = f"""
Dear {user.first_name},

Your account has been successfully created.

You may now proceed to submit an onboarding application to make cross-border payments.

Access the platform here:
{WEBSITE_URL}

Best regards,
Onboarding Team
"""

    return subject, body

def build_application_submitted_email(app: ApplicationForm, firstName: str):
    subject = "Application Submitted Successfully"

    body = f"""
Dear {firstName},

Your application to open a business account for "{app.business_name}" has been successfully submitted.

Application ID: {app.application_id}
Current Status: Under Review

Track your application here:
{WEBSITE_URL}/applications/{app.application_id}

Best regards,
Onboarding Team
"""
    return subject, body

def build_approved_email(app: ApplicationForm, firstName: str):
    subject = "Application Approved"

    body = f"""
Dear {firstName},

Your application to open a business account for "{app.business_name}" has been approved.

Application ID: {app.application_id}

Next steps:
{WEBSITE_URL}/applications/{app.application_id}

Best regards,
Onboarding Team
"""

    return subject, body

def build_rejected_email(app: ApplicationForm, firstName: str):
    subject = "Application Unsuccessful"

    body = f"""
Dear {firstName},

Your application to open a business account for "{app.business_name}" was unsuccessful.

Application ID: {app.application_id}

Reason:
{app.form_data["reason"]}

View details here:
{WEBSITE_URL}/applications/{app.application_id}

Best regards,
Onboarding Team
"""

    return subject, body

def build_withdrawn_email(app: ApplicationForm, firstName: str):
    subject = "Application Withdrawn"

    body = f"""
Dear {firstName},

The application that was previously assigned to you for review has been withdrawn by the applicant.

Application ID: {app.application_id}
Business Name: {app.business_name}

No further action is required on this application.
Thank you for your time and effort in reviewing the case.

Best regards,
Onboarding Team
"""

    return subject, body

def build_staff_manual_review_email(app: ApplicationForm, staff: str):
    subject = f"Manual Review Required: Application {app.application_id}"

    body = f"""
Dear {staff},

Application ID: {app.application_id}
Business Name: {app.business_name}

This application requires manual review.

Access application here:
{INTERNAL_URL}/applications/{app.application_id}

Regards,
Onboarding System
"""

    return subject, body

def build_user_manual_review_email(app: ApplicationForm, firstName: str):
    subject = "Application Under Manual Review"

    body = f"""
Dear {firstName},

Your application for "{app.business_name}" is undergoing additional review by our bank staff.

Application ID: {app.application_id}

We will notify you if further information is required.

Regards,
Onboarding Team
"""

    return subject, body

def build_action_required_email(
    app: ApplicationForm,
    firstName: str,
    reason: str,
    requested_docs: list,
    requested_qns: list,
):
    subject = "Action Required: Application Update Needed"

    docs_text = ""
    for d in requested_docs:
        name = d.get("document_name", "").strip()
        desc = d.get("document_desc", "").strip()

        if name and desc:
            docs_text += f"- {name}: {desc}\n"
        elif name:
            docs_text += f"- {name}\n"

    if not docs_text:
        docs_text = "None\n"

    qns_text = ""
    for q in requested_qns:
        qt = q.get("question_text", "").strip()
        if qt:
            qns_text += f"- {qt}\n"

    if not qns_text:
        qns_text = "None\n"

    body = f"""
Dear {firstName},

Your application for "{app.business_name}" requires further action.

Application ID: {app.application_id}

Reason:
{reason}

Requested Documents:
{docs_text}

Requested Clarifications:
{qns_text}

Please update your application here:
{WEBSITE_URL}/applications/{app.application_id}

Regards,
Onboarding Team
"""

    return subject, body

def build_auto_rejected_email(app: ApplicationForm, firstName: str):
    subject = "Application Unsuccessful"

    body = f"""
Dear {firstName},

Your application to open a business account for "{app.business_name}" was automatically rejected after compliance checks.

Application ID: {app.application_id}

Reason:
{app.form_data.get("reason", "Application auto-rejected due to high risk.")}

View details here:
{WEBSITE_URL}/applications/{app.application_id}

Best regards,
Onboarding Team
"""

    return subject, body
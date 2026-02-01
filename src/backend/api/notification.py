from backend.models.application import ApplicationForm
from backend.models.user import User

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

def build_draft_saved_email(application):
    subject = "Draft Application Saved – Action Required"

    body = f"""
Hi,

You have saved a draft application for:

Business Name: {application.business_name}
Application ID: {application.application_id}

Your application has not been submitted yet.
If no action is taken, this draft will be automatically deleted after 7 days.

Please return to complete and submit your application.

Regards,
SME Onboarding Team
"""
    return subject, body

def build_draft_reminder_email(app: ApplicationForm, user: User):
    subject = "Reminder: Incomplete Application"

    body = f"""
Dear {user.first_name},

Your application for "{app.business_name}" is still incomplete.

Application ID: {app.application_id}

Our system will delete incomplete application after 48 days. Please return to complete and submit your application.

Resume here:
{WEBSITE_URL}/applications/{app.application_id}

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

def build_approved_email(app: ApplicationForm, user: User):
    subject = "Application Approved"

    body = f"""
Dear {user.first_name},

Your application to open a business account for "{app.business_name}" has been approved.

Application ID: {app.application_id}

Next steps:
{WEBSITE_URL}/applications/{app.application_id}

Best regards,
Onboarding Team
"""

    return subject, body

def build_rejected_email(app: ApplicationForm, user: User):
    subject = "Application Unsuccessful"

    body = f"""
Dear {user.first_name},

Your application to open a business account for "{app.business_name}" was unsuccessful.

Application ID: {app.application_id}

Reason:
{app.reason}

View details here:
{WEBSITE_URL}/applications/{app.application_id}

Best regards,
Onboarding Team
"""

    return subject, body

def build_staff_manual_review_email(app: ApplicationForm, staff: User):
    subject = f"Manual Review Required: Application {app.application_id}"

    body = f"""
Dear {staff.first_name},

Application ID: {app.application_id}
Business Name: {app.business_name}

This application requires manual review.

Access application here:
{INTERNAL_URL}/applications/{app.application_id}

Regards,
Onboarding System
"""

    return subject, body

def build_user_manual_review_email(app: ApplicationForm, user: User):
    subject = "Application Under Manual Review"

    body = f"""
Dear {user.first_name},

Your application for "{app.business_name}" is undergoing additional review.

Application ID: {app.application_id}

We will notify you if further information is required.

Regards,
Onboarding Team
"""

    return subject, body

def build_action_required_email(app: ApplicationForm, user: User):
    subject = "Action Required: Application Update Needed"

    body = f"""
Dear {user.first_name},

Your application for "{app.business_name}" requires further action.

Application ID: {app.application_id}

Staff Notes:
{app.reason}

Please update your application here:
{WEBSITE_URL}/applications/{app.application_id}

Regards,
Onboarding Team
"""

    return subject, body

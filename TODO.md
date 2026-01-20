# TODO: Implement Email Notifications for SME Application Status Changes

## Steps to Complete

1. **Update backend dependencies**: Add email sending library (e.g., fastapi-mail or smtplib) to requirements.txt or install via pip. ✅
2. **Create email service module**: Add a new file `src/backend/email_service.py` to handle email sending logic. ✅
3. **Define application status model**: Add a Pydantic model for application status in `src/backend/main.py`. ✅
4. **Implement status change endpoint**: Add an endpoint in `src/backend/main.py` to update application status and trigger notifications. ✅
5. **Add email templates**: Create functions in `email_service.py` for each status email content.
6. **Implement reminder email logic**: Add background task or scheduler for "Requires Action" reminders after 48 hours. ✅
7. **Test the implementation**: Run the backend and verify email notifications are sent correctly. ✅

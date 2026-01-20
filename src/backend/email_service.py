def send_email(to_email, subject, body):
    print("\n================ EMAIL SENT ================", flush=True)
    print(f"To: {to_email}", flush=True)
    print(f"Subject: {subject}", flush=True)
    print("Body:", flush=True)
    print(body, flush=True)
    print("===========================================\n", flush=True)

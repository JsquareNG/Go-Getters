from locust import HttpUser, task
import threading

# Replace with REAL accounts already in your DB
CREDENTIALS = [
    {"email": "demo11@gmail.com", "password": "Test1234!"},
    {"email": "demo15@gmail.com", "password": "Test1234!"},
    {"email": "demo12@gmail.com", "password": "Test1234!"},
]

credential_index = 0
credential_lock = threading.Lock()


class LoginUser(HttpUser):
    host = "http://localhost:8000"
    wait_time = lambda self: 0

    def on_start(self):
        global credential_index

        with credential_lock:
            creds = CREDENTIALS[credential_index % len(CREDENTIALS)]
            credential_index += 1

        self.email = creds["email"]
        self.password = creds["password"]

    @task
    def login_once(self):
        payload = {
            "email": self.email,
            "password": self.password,
        }

        with self.client.post(
            "/users/login",
            json=payload,
            catch_response=True,
            name="POST /users/login",
        ) as response:

            print(f"{self.email} -> STATUS: {response.status_code}")

            if response.status_code not in [200, 201]:
                response.failure(
                    f"{self.email} failed login: {response.status_code} | {response.text}"
                )
                self.stop(force=True)
                return

            try:
                data = response.json()
            except Exception:
                response.failure(f"{self.email} invalid JSON: {response.text}")
                self.stop(force=True)
                return

            if "access_token" not in data:
                response.failure(f"{self.email} missing access_token: {data}")
                self.stop(force=True)
                return

            response.success()
            self.stop(force=True)
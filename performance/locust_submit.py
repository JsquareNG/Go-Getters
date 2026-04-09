from locust import HttpUser, task, between
import random
import string

def random_string(length=6):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

def random_business_name():
    return f"StressTestBiz_{random_string()}"

TOKENS = [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDAwMDAwNTEiLCJyb2xlIjoiU01FIiwiZXhwIjoxNzc1NjQ2NjY1fQ.wV6LjMB9rRECJjib3jNIHHs7O1d9WV24jmldHqXXYnY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDAwMDAwNTAiLCJyb2xlIjoiU01FIiwiZXhwIjoxNzc1NjQ3ODIwfQ.SfyX-gXUaCXdxCEI5Rn6b-gtx_MbUu9U3LW_ZLEwYII",
]

class SubmitApplicationUser(HttpUser):
    host = "http://localhost:8000"
    wait_time = between(1, 2)

    token_index = 0

    def on_start(self):
        cls = type(self)
        self.token = TOKENS[cls.token_index % len(TOKENS)]
        cls.token_index += 1

        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    @task
    def submit_application(self):
        payload = {
            "provider_session_id": None,
            "form_data": {
                "country": "Singapore",
                "businessName": random_business_name(),
                "businessType": "PRIVATE_LIMITED_COMPANY",
            },
        }

        with self.client.post(
            "/applications/firstSubmit",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="POST /applications/firstSubmit",
        ) as response:
            print("STATUS:", response.status_code)

            if response.status_code not in [200, 201]:
                response.failure(f"Failed: {response.status_code} | {response.text}")
                return

            data = response.json()
            if "application_id" not in data:
                response.failure(f"Missing application_id: {data}")
                return

            response.success()
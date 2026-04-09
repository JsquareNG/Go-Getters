from locust import HttpUser, task
import random
import string


def random_string(length=6):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def random_business_name(prefix="StressTestBiz"):
    return f"{prefix}_{random_string()}"


TOKENS = [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDAwMDAwNDYiLCJyb2xlIjoiU01FIiwiZXhwIjoxNzc1NzUxOTAzfQ.ngWWbvpDuOr2pC8byjliTOgPU7H4RWGzlsOV-fb1nT4",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDAwMDAwNDgiLCJyb2xlIjoiU01FIiwiZXhwIjoxNzc1NzUxODkyfQ.rMDodbGcLtneKXTeq_0G4NIOhE-tJkQM68ZXwyv3dhA",
]


class SubmitApplicationUser(HttpUser):
    host = "http://localhost:8000"
    wait_time = lambda self: 0
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
    def submit_application_once(self):
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
            print("BODY:", response.text)

            if response.status_code not in [200, 201]:
                response.failure(f"Failed: {response.status_code} | {response.text}")
                self.stop(force=True)
                return

            try:
                data = response.json()
            except Exception:
                response.failure(f"Response is not valid JSON: {response.text}")
                self.stop(force=True)
                return

            if "application_id" not in data:
                response.failure(f"Missing application_id: {data}")
                self.stop(force=True)
                return

            response.success()
            self.stop(force=True)
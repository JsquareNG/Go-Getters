from locust import HttpUser, task
import threading
import random

STAFF_APPLICATION_MAP = [
    {
        "email": "staff@gmail.com",
        "password": "Staff1234!",
        "applications": ["00000390", "00000389"]
    },
    {
        "email": "stafftest@yahoo.com",
        "password": "GoGetters123!",
        "applications": ["00000428", "00000427"]
    },
]

index = 0
lock = threading.Lock()


class RequestDocumentsUser(HttpUser):
    host = "http://localhost:8000"
    wait_time = lambda self: 0

    def on_start(self):
        global index

        with lock:
            staff = STAFF_APPLICATION_MAP[index % len(STAFF_APPLICATION_MAP)]
            index += 1

        self.email = staff["email"]
        self.password = staff["password"]
        self.application_id = random.choice(staff["applications"])

        login_resp = self.client.post(
            "/users/login",
            json={"email": self.email, "password": self.password},
        )

        if login_resp.status_code not in [200, 201]:
            raise Exception("Login failed")

        self.token = login_resp.json()["access_token"]

        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    @task
    def request_documents_once(self):
        payload = {
            "reason": "Additional verification required.",
            "documents": [
                {
                    "document_name": "Bank Statement",
                    "document_desc": "Latest 3 months"
                }
            ],
            "questions": [
                {
                    "question_text": "Clarify source of funds",
                    "answer_text": None
                }
            ]
        }

        with self.client.put(
            f"/applications/escalate/{self.application_id}",
            json=payload,
            headers=self.headers,
            catch_response=True,
        ) as response:

            print(self.email, "->", self.application_id, response.status_code)

            if response.status_code not in [200, 201]:
                response.failure(response.text)
                self.stop(force=True)
                return

            response.success()
            self.stop(force=True)
from locust import HttpUser, task
import random
import threading


# Replace these with REAL application IDs that already exist in your DB
APPLICATION_IDS = [
    "00000365",
    "00000366",
    "00000367",
    "00000368",
    "00000369",
    "00000370",
    "00000371",
    "00000372",
    "00000373",
    "00000374",
    "00000375",
    "00000376",
    "00000377",
    "00000378",
    "00000379",
    "00000380",
    "00000381",
    "00000382",
    "00000383",
    "00000384",
    "00000385",
]


def build_application_record(application_id: str):
    return {
        "application_id": application_id,
        "form_data": {}
    }


class SimulationRunUser(HttpUser):
    host = "http://localhost:8000"
    wait_time = lambda self: 0

    @task
    def run_simulation_once(self):
        # Change this number depending on how many selected applications
        # each user is simulating in one click
        batch_size = 20

        selected_ids = random.sample(APPLICATION_IDS, batch_size)

        payload = {
            "applications": [
                build_application_record(app_id) for app_id in selected_ids
            ]
        }

        with self.client.post(
            "/simulation-testing/run",  # change this if your actual route has a prefix
            json=payload,
            catch_response=True,
            name="POST /simulation-testing/run",
        ) as response:
            print("STATUS:", response.status_code)
            print("BODY:", response.text[:500])

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

            required_keys = ["total", "success_count", "failed_count", "results"]
            missing = [k for k in required_keys if k not in data]
            if missing:
                response.failure(f"Missing keys in response: {missing} | data={data}")
                self.stop(force=True)
                return

            if data["total"] != batch_size:
                response.failure(
                    f"Unexpected total. Expected {batch_size}, got {data['total']}"
                )
                self.stop(force=True)
                return

            response.success()
            self.stop(force=True)
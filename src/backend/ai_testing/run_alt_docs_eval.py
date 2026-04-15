import json
from pathlib import Path

import requests


API_URL = "http://127.0.0.1:8000/manual-review-ai/alternative-documents"

PAYLOAD_PATH = Path(__file__).parent / "alt_docs_test_payload.json"
OUTPUT_PATH = Path(__file__).parent / "alt_docs_last_response.json"


def main():
    with open(PAYLOAD_PATH, "r", encoding="utf-8") as f:
        payload = json.load(f)

    print("🚀 Sending request...")

    response = requests.post(API_URL, json=payload, timeout=120)

    print("Status:", response.status_code)

    try:
        data = response.json()

        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(json.dumps(data, indent=2, ensure_ascii=False))
        print(f"\n✅ Response saved to: {OUTPUT_PATH}")

    except Exception:
        print("❌ Failed to parse JSON")
        print(response.text)


if __name__ == "__main__":
    main()
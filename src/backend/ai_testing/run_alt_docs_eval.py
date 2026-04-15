import json
from pathlib import Path

import requests


API_URL = "http://127.0.0.1:8000/manual-review-ai/alternative-documents"

PAYLOAD_PATH = Path(__file__).parent / "alt_docs_test_payload.json"
OUTPUT_PATH = Path(__file__).parent / "alt_docs_last_response.json"
EXPECTED_PATH = Path(__file__).parent / "alt_docs_expected.json"


def main():
    with open(PAYLOAD_PATH, "r", encoding="utf-8") as f:
        payload = json.load(f)

    with open(EXPECTED_PATH, "r", encoding="utf-8") as f:
        expected = json.load(f)

    print("🚀 Sending request...")

    response = requests.post(API_URL, json=payload, timeout=120)

    print("Status:", response.status_code)

    try:
        data = response.json()

        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Response saved to: {OUTPUT_PATH}")

        if response.status_code != 200 or not data.get("success"):
            print("\n❌ API did not return success")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return

        results = data.get("data", {}).get("results", [])
        total = 0
        passed = 0

        print("\n" + "=" * 80)
        print("ALTERNATIVE DOCUMENT EVALUATION")
        print("=" * 80)

        for item in results:
            item_id = item.get("item_id")
            original_name = item.get("document_name", "Unknown")
            alternatives = item.get("alternative_document_options", [])

            actual_values = [opt.get("value") for opt in alternatives if opt.get("value")]
            acceptable_values = expected.get(item_id, {}).get("acceptable_values", [])

            match_values = [v for v in actual_values if v in acceptable_values]
            is_pass = len(match_values) > 0

            total += 1
            if is_pass:
                passed += 1

            print(f"\nOriginal Document: {original_name}")
            print(f"Item ID: {item_id}")
            print("Returned Alternatives:")

            if not alternatives:
                print("  - None")
            else:
                for idx, opt in enumerate(alternatives, start=1):
                    label = opt.get("label", "")
                    value = opt.get("value", "")
                    desc = opt.get("description", "")
                    print(f"  {idx}. {label} ({value})")
                    if desc:
                        print(f"     Description: {desc}")

            print(f"Expected Acceptable Values: {acceptable_values}")
            print(f"Matched Values: {match_values}")
            print(f"Result: {'PASS ✅' if is_pass else 'FAIL ❌'}")
            print("-" * 80)

        accuracy = round((passed / total) * 100, 2) if total else 0.0

        summary = {
            "total_documents_checked": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": accuracy,
        }

        print("\nSUMMARY")
        print(json.dumps(summary, indent=2, ensure_ascii=False))

    except Exception as e:
        print("❌ Failed to parse JSON")
        print("Error:", str(e))
        print(response.text)


if __name__ == "__main__":
    main()
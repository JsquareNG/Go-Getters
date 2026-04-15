import json
from pathlib import Path

import requests


CASES_PATH = Path(__file__).parent / "manual_review_eval_cases.json"
OUTPUT_PATH = Path(__file__).parent / "manual_review_eval_results_via_api.json"
API_URL = "http://127.0.0.1:8000/manual-review-ai/generate"


def main():
    with open(CASES_PATH, "r", encoding="utf-8") as f:
        cases = json.load(f)

    results = []
    correct = 0
    errors = 0

    for case_data in cases:
        payload = {
            "application_data": case_data["application_data"],
            "risk_assessment": case_data["risk_assessment"],
            "documents": case_data["documents"],
            "action_requests": case_data["action_requests"],
        }

        row = {
            "name": case_data["name"],
            "expected_action": case_data["expected_action"],
            "actual_action": None,
            "match": False,
            "success": False,
            "error": None,
            "raw_response": None,
        }

        try:
            response = requests.post(API_URL, json=payload, timeout=120)
            row["raw_response"] = response.json()

            if response.status_code == 200 and row["raw_response"].get("success") is True:
                actual_action = row["raw_response"]["data"].get("recommended_action")
                row["actual_action"] = actual_action
                row["success"] = True
                row["match"] = actual_action == case_data["expected_action"]

                if row["match"]:
                    correct += 1
            else:
                row["error"] = f"HTTP {response.status_code}: {response.text}"
                errors += 1

        except Exception as e:
            row["error"] = str(e)
            errors += 1

        results.append(row)

    total = len(cases)
    summary = {
        "total_cases": total,
        "successful_calls": total - errors,
        "failed_calls": errors,
        "action_accuracy": round((correct / total) * 100, 2),
    }

    output = {
        "summary": summary,
        "results": results,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
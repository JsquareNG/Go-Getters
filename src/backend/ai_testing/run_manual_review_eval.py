import json
from pathlib import Path

from backend.api.smart_ai import generate_manual_review_suggestions


CASES_PATH = Path(__file__).parent / "manual_review_eval_cases.json"
OUTPUT_PATH = Path(__file__).parent / "manual_review_eval_results.json"


def normalize_text(value: str) -> str:
    return (value or "").strip().lower()


def extract_doc_names(output: dict) -> list[str]:
    docs = output.get("suggested_documents") or []
    names = []
    for d in docs:
        if isinstance(d, dict):
            names.append(normalize_text(d.get("document_name", "")))
        elif isinstance(d, str):
            names.append(normalize_text(d))
    return names


def extract_questions(output: dict) -> list[str]:
    questions = output.get("suggested_questions") or []
    return [normalize_text(q) for q in questions if isinstance(q, str)]


def main():
    with open(CASES_PATH, "r", encoding="utf-8") as f:
        cases = json.load(f)

    results = []
    action_correct = 0
    forbidden_doc_violations = 0
    repeated_question_violations = 0
    approve_reject_extra_items = 0
    schema_failures = 0

    for case_data in cases:
        try:
            output = generate_manual_review_suggestions(
                application_data=case_data["application_data"],
                risk_assessment=case_data["risk_assessment"],
                documents=case_data["documents"],
                action_requests=case_data["action_requests"],
            )
            schema_ok = True
        except Exception as e:
            schema_ok = False
            output = {"error": str(e)}
            schema_failures += 1

        row = {
            "name": case_data["name"],
            "expected_action": case_data["expected_action"],
            "notes": case_data.get("notes", ""),
            "schema_ok": schema_ok,
            "output": output,
            "action_correct": False,
            "forbidden_doc_violation": False,
            "repeated_question_violation": False,
            "approve_reject_extra_items": False,
        }

        if schema_ok:
            actual_action = output.get("recommended_action")
            row["action_correct"] = actual_action == case_data["expected_action"]
            if row["action_correct"]:
                action_correct += 1

            forbidden_docs = [
                normalize_text(x)
                for x in case_data.get("forbidden_documents", [])
            ]
            output_doc_names = extract_doc_names(output)
            if any(fd in output_doc_names for fd in forbidden_docs):
                row["forbidden_doc_violation"] = True
                forbidden_doc_violations += 1

            prior_questions = [
                normalize_text(ar.get("question", ""))
                for ar in case_data.get("action_requests", [])
                if ar.get("question") and ar.get("answer")
            ]
            output_questions = extract_questions(output)
            if any(pq in output_questions for pq in prior_questions):
                row["repeated_question_violation"] = True
                repeated_question_violations += 1

            if actual_action in {"approve", "reject"}:
                if output.get("suggested_documents") or output.get("suggested_questions"):
                    row["approve_reject_extra_items"] = True
                    approve_reject_extra_items += 1

        results.append(row)

    total = len(cases)
    summary = {
        "total_cases": total,
        "schema_pass_rate": round(((total - schema_failures) / total) * 100, 2),
        "action_accuracy": round((action_correct / total) * 100, 2),
        "forbidden_doc_violation_rate": round((forbidden_doc_violations / total) * 100, 2),
        "repeated_question_violation_rate": round((repeated_question_violations / total) * 100, 2),
        "approve_reject_extra_items_rate": round((approve_reject_extra_items / total) * 100, 2),
    }

    payload = {
        "summary": summary,
        "results": results,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
from backend.services.kyc_media_service import download_upload_and_get_kyc_public_url


def mask_document_number(doc_number: str | None) -> str | None:
    if not doc_number:
        return None
    if len(doc_number) < 6:
        return doc_number
    return f"{doc_number[:5]}***{doc_number[-1]}"


def collect_risk_flags(idv: dict, live: dict, face: dict) -> list[str]:
    flags = []

    for warning in idv.get("warnings", []):
        risk = warning.get("risk")
        if risk:
            flags.append(risk)

    for warning in live.get("warnings", []):
        risk = warning.get("risk")
        if risk:
            flags.append(risk)

    for warning in face.get("warnings", []):
        risk = warning.get("risk")
        if risk:
            flags.append(risk)

    return list(dict.fromkeys(flags))


def build_images_json(application_id: str, idv: dict, live: dict, face: dict) -> dict:
    return {
        "portrait_image_url": download_upload_and_get_kyc_public_url(
            idv.get("portrait_image"), application_id, "portrait", ".jpg"
        ),
        "front_image_url": download_upload_and_get_kyc_public_url(
            idv.get("front_image"), application_id, "front", ".jpg"
        ),
        "back_image_url": download_upload_and_get_kyc_public_url(
            idv.get("back_image"), application_id, "back", ".jpg"
        ),
        "full_front_pdf_url": download_upload_and_get_kyc_public_url(
            idv.get("full_front_image"), application_id, "full_front", ".pdf"
        ),
        "full_back_pdf_url": download_upload_and_get_kyc_public_url(
            idv.get("full_back_image"), application_id, "full_back", ".pdf"
        ),
        "liveness_reference_image_url": download_upload_and_get_kyc_public_url(
            live.get("reference_image"), application_id, "liveness_reference", ".jpg"
        ),
        "liveness_video_url": download_upload_and_get_kyc_public_url(
            live.get("video_url"), application_id, "liveness_video", ".mp4"
        ),
        "face_match_source_image_url": download_upload_and_get_kyc_public_url(
            face.get("source_image"), application_id, "face_match_source", ".jpg"
        ),
        "face_match_target_image_url": download_upload_and_get_kyc_public_url(
            face.get("target_image"), application_id, "face_match_target", ".jpg"
        )
    }


def map_didit_payload_to_internal_json(didit_payload: dict) -> dict:
    application_id = didit_payload.get("vendor_data")

    idv = (didit_payload.get("id_verifications") or [{}])[0]
    live = (didit_payload.get("liveness_checks") or [{}])[0]
    face = (didit_payload.get("face_matches") or [{}])[0]

    risk_flags = collect_risk_flags(idv, live, face)

    has_duplicate_identity_hit = "POSSIBLE_DUPLICATED_USER" in risk_flags
    has_duplicate_face_hit = "POSSIBLE_DUPLICATED_FACE" in risk_flags

    images = build_images_json(application_id, idv, live, face)

    doc_number = idv.get("document_number")

    return {
        "application_id": application_id,
        "provider": "didit",
        "provider_session_id": didit_payload.get("session_id"),
        "provider_session_number": didit_payload.get("session_number"),
        "workflow_id": didit_payload.get("workflow_id"),
        "provider_session_url": didit_payload.get("session_url"),
        "overall_status": didit_payload.get("status"),
        "manual_review_required": didit_payload.get("status") == "Declined",
        "full_name": idv.get("full_name"),
        "document_type": idv.get("document_type"),
        "document_number": doc_number,
        "document_number_masked": mask_document_number(doc_number),
        "date_of_birth": idv.get("date_of_birth"),
        "gender": idv.get("gender"),
        "issuing_state_code": idv.get("issuing_state"),
        "formatted_address": idv.get("formatted_address"),
        "id_verification_status": idv.get("status"),
        "liveness_status": live.get("status"),
        "liveness_score": live.get("score"),
        "face_match_status": face.get("status"),
        "face_match_score": face.get("score"),
        "has_duplicate_identity_hit": has_duplicate_identity_hit,
        "has_duplicate_face_hit": has_duplicate_face_hit,
        "risk_flags": risk_flags,
        "images": images,
        "created_at": didit_payload.get("created_at")
    }
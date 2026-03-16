import React, { useEffect, useRef, useState } from "react";
import { livenessDetectionApi } from "../api/livenessDetectionApi";

export default function DiditCallback() {
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("");
  const [decision, setDecision] = useState(null);
  const [savedResult, setSavedResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasRunRef = useRef(false);

  const mapDiditToPayload = (diditData) => {
    const idv = diditData?.id_verifications?.[0] || {};
    const live = diditData?.liveness_checks?.[0] || {};
    const face = diditData?.face_matches?.[0] || {};

    const riskFlags = [
      ...(idv?.warnings || []).map((w) => w.risk).filter(Boolean),
      ...(live?.warnings || []).map((w) => w.risk).filter(Boolean),
      ...(face?.warnings || []).map((w) => w.risk).filter(Boolean),
    ];

    const uniqueRiskFlags = [...new Set(riskFlags)];

    const documentNumber = idv?.document_number || "";
    const documentNumberMasked =
      documentNumber.length >= 6
        ? `${documentNumber.slice(0, 5)}***${documentNumber.slice(-1)}`
        : documentNumber;

    return {
      application_id: diditData?.vendor_data || null,
      provider: "didit",
      provider_session_id: diditData?.session_id || null,
      provider_session_number: diditData?.session_number || null,
      workflow_id: diditData?.workflow_id || null,
      provider_session_url: diditData?.session_url || null,
      overall_status: diditData?.status || null,
      manual_review_required: diditData?.status === "Declined",

      full_name: idv?.full_name || null,
      document_type: idv?.document_type || null,
      document_number: documentNumber || null,
      document_number_masked: documentNumberMasked || null,
      date_of_birth: idv?.date_of_birth || null,
      gender: idv?.gender || null,
      issuing_state_code: idv?.issuing_state || null,
      formatted_address: idv?.formatted_address || null,

      id_verification_status: idv?.status || null,
      liveness_status: live?.status || null,
      liveness_score: live?.score || null,
      face_match_status: face?.status || null,
      face_match_score: face?.score || null,

      has_duplicate_identity_hit: uniqueRiskFlags.includes("POSSIBLE_DUPLICATED_USER"),
      has_duplicate_face_hit: uniqueRiskFlags.includes("POSSIBLE_DUPLICATED_FACE"),

      risk_flags: uniqueRiskFlags,

      images: {
        portrait_image_url: idv?.portrait_image || null,
        front_image_url: idv?.front_image || null,
        back_image_url: idv?.back_image || null,
        full_front_pdf_url: idv?.full_front_image || null,
        full_back_pdf_url: idv?.full_back_image || null,
        liveness_reference_image_url: live?.reference_image || null,
        liveness_video_url: live?.video_url || null,
        face_match_source_image_url: face?.source_image || null,
        face_match_target_image_url: face?.target_image || null,
      },

      created_at: diditData?.created_at || null,
    };
  };

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const params = new URLSearchParams(window.location.search);

    const verificationSessionId = params.get("verificationSessionId");
    const returnedStatus = params.get("status");

    setSessionId(verificationSessionId || "");
    setStatus(returnedStatus || "");

    const processDiditResult = async () => {
      try {
        if (!verificationSessionId) {
          setSavedResult({ error: "No verificationSessionId found in callback URL" });
          setLoading(false);
          return;
        }

        const storageKey = `didit_saved_${verificationSessionId}`;

        // Prevent duplicate POST on refresh / revisit / StrictMode
        const alreadySaved = sessionStorage.getItem(storageKey);
        if (alreadySaved === "true") {
          console.log("This Didit session was already saved before:", verificationSessionId);

          const response = await fetch(
            `http://127.0.0.1:8000/didit/session/${verificationSessionId}/decision`
          );
          const diditData = await response.json();

          setDecision(diditData);
          setSavedResult({
            message: "KYC result was already saved previously. Skipped duplicate save."
          });
          setLoading(false);
          return;
        }

        // 1. fetch raw Didit decision JSON
        const response = await fetch(
          `http://127.0.0.1:8000/didit/session/${verificationSessionId}/decision`
        );
        const diditData = await response.json();

        setDecision(diditData);

        // 2. map raw Didit JSON into DB payload
        const payload = mapDiditToPayload(diditData);
        console.log("Mapped payload to save:", payload);

        // 3. POST into your own DB
        const saved = await livenessDetectionApi(payload);
        console.log("Saved DB response:", saved);

        setSavedResult(saved);

        // Mark as saved so refresh / second render won't repost
        sessionStorage.setItem(storageKey, "true");
      } catch (err) {
        console.error("Didit callback error:", err);
        setSavedResult({
          error: err?.response?.data || err.message || "Unknown error"
        });
      } finally {
        setLoading(false);
      }
    };

    processDiditResult();
  }, []);

  return (
    <div style={{ padding: "24px", fontFamily: "Arial" }}>
      <h2>Didit Verification Result</h2>

      <p><strong>Session ID:</strong> {sessionId || "N/A"}</p>
      <p><strong>Redirect Status:</strong> {status || "N/A"}</p>

      {loading ? (
        <p>Loading final decision...</p>
      ) : (
        <>
          <h3>Raw Didit Response</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "12px",
              borderRadius: "8px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(decision, null, 2)}
          </pre>

          <h3 style={{ marginTop: "24px" }}>Saved DB Response</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "12px",
              borderRadius: "8px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(savedResult, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
import React, { useEffect, useRef } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { livenessDetectionApi } from "@/api/livenessDetectionApi";

const DEFAULT_KYC_DATA = {
  status: "idle",
  loading: false,
  sessionId: "",
  overallStatus: "",
  idVerificationStatus: "",
  livenessStatus: "",
  livenessScore: null,
  faceMatchStatus: "",
  faceMatchScore: null,
};

const MIN_FACE_MATCH_SCORE = 60;

const KycVerificationCard = ({
  data,
  disabled = false,
  onFieldChange,
}) => {
  const processedDiditSessionRef = useRef("");
  const latestKycDataRef = useRef(DEFAULT_KYC_DATA);

  const kycData = data?.kycData || DEFAULT_KYC_DATA;
  const kycStatus = kycData.status || "idle";
  const kycLoading = kycData.loading || false;
  const kycOverallStatus = kycData.overallStatus || "";
  const kycIdVerificationStatus = kycData.idVerificationStatus || "";
  const kycLivenessStatus = kycData.livenessStatus || "";
  const kycLivenessScore = kycData.livenessScore ?? null;
  const kycFaceMatchStatus = kycData.faceMatchStatus || "";
  const kycFaceMatchScore = kycData.faceMatchScore ?? null;

  const numericFaceMatchScore =
    kycFaceMatchScore === null || kycFaceMatchScore === undefined
      ? null
      : Number(kycFaceMatchScore);

  const isKycPassed =
    kycStatus === "completed" &&
    numericFaceMatchScore !== null &&
    numericFaceMatchScore >= MIN_FACE_MATCH_SCORE;

  const isKycFailed =
    kycStatus === "completed" &&
    numericFaceMatchScore !== null &&
    numericFaceMatchScore < MIN_FACE_MATCH_SCORE;

  useEffect(() => {
    latestKycDataRef.current = kycData;
  }, [kycData]);

  const updateKycData = (patch) => {
    onFieldChange("kycData", {
      ...DEFAULT_KYC_DATA,
      ...(latestKycDataRef.current || {}),
      ...patch,
    });
  };

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

      has_duplicate_identity_hit: uniqueRiskFlags.includes(
        "POSSIBLE_DUPLICATED_USER",
      ),
      has_duplicate_face_hit: uniqueRiskFlags.includes(
        "POSSIBLE_DUPLICATED_FACE",
      ),

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

  const handleStartKyc = async () => {
    updateKycData({
      status: "idle",
      loading: true,
      sessionId: "",
      overallStatus: "",
      idVerificationStatus: "",
      livenessStatus: "",
      livenessScore: null,
      faceMatchStatus: "",
      faceMatchScore: null,
    });

    onFieldChange("provider_session_id", null);

    try {
      const applicationId =
        data?.application_id || data?.applicationId || data?.appId || "";

      const callbackUrl = window.location.href.split("?")[0];

      const payload = applicationId
        ? { application_id: applicationId, callback_url: callbackUrl }
        : { callback_url: callbackUrl };

      const response = await fetch(
        "http://127.0.0.1:8000/didit/create-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to create Didit session.");
      }

      const result = await response.json();

      updateKycData({
        sessionId: result.session_id || "",
      });

      if (result.verification_url) {
        updateKycData({
          status: "pending",
          sessionId: result.session_id || "",
          loading: false,
        });
        window.location.href = result.verification_url;
      } else {
        updateKycData({ status: "idle", loading: false });
        alert("No verification_url returned. Check console and backend logs.");
      }
    } catch (error) {
      console.error("Start KYC frontend error:", error);
      updateKycData({ status: "idle", loading: false });
    } finally {
      updateKycData({ loading: false });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verificationSessionId = params.get("verificationSessionId");
    const returnedStatus = params.get("status");

    if (!verificationSessionId) return;
    if (processedDiditSessionRef.current === verificationSessionId) return;

    processedDiditSessionRef.current = verificationSessionId;
    window.history.replaceState({}, document.title, window.location.pathname);

    const processDiditReturn = async () => {
      try {
        updateKycData({
          loading: true,
          sessionId: verificationSessionId,
        });

        onFieldChange("provider_session_id", verificationSessionId);

        const response = await fetch(
          `http://127.0.0.1:8000/didit/session/${verificationSessionId}/decision`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch Didit decision.");
        }

        const diditData = await response.json();
        const idv = diditData?.id_verifications?.[0] || {};
        const live = diditData?.liveness_checks?.[0] || {};
        const face = diditData?.face_matches?.[0] || {};

        updateKycData({
          status: "completed",
          loading: false,
          sessionId: verificationSessionId,
          overallStatus: diditData?.status || returnedStatus || "",
          idVerificationStatus: idv?.status || "",
          livenessStatus: live?.status || "",
          livenessScore: live?.score ?? null,
          faceMatchStatus: face?.status || "",
          faceMatchScore: face?.score ?? null,
        });

        const payload = mapDiditToPayload(diditData);
        await livenessDetectionApi(payload);
      } catch (error) {
        console.error("Error processing Didit return:", error);
      } finally {
        updateKycData({ loading: false });
      }
    };

    processDiditReturn();
  }, [onFieldChange]);

  return (
    <Card
      className={`mb-6 border-1 transition-colors ${
        isKycPassed
          ? "border-[hsl(var(--status-approved))]/30 bg-[hsl(var(--status-approved))]/5"
          : kycStatus === "pending"
            ? "border-[hsl(var(--status-in-review))]/30 bg-[hsl(var(--status-in-review))]/5"
            : isKycFailed
              ? "border-red-200 bg-red-50"
              : "border-border"
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isKycPassed
                  ? "bg-[hsl(var(--status-approved))]/15"
                  : kycStatus === "pending"
                    ? "bg-[hsl(var(--status-in-review))]/15"
                    : isKycFailed
                      ? "bg-red-100"
                      : "bg-primary/10"
              }`}
            >
              <ShieldCheck
                className={`h-6 w-6 ${
                  isKycPassed
                    ? "text-[hsl(var(--status-approved))]"
                    : kycStatus === "pending"
                      ? "text-[hsl(var(--status-in-review))]"
                      : isKycFailed
                        ? "text-red-600"
                        : "text-primary"
                }`}
              />
            </div>

            <div>
              <h3 className="font-semibold text-foreground text-sm">
                Identity Verification (KYC)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isKycPassed
                  ? "Verification completed successfully. You can proceed with the application."
                  : kycStatus === "pending"
                    ? "Verification is in progress. Waiting for the applicant to complete the process."
                    : isKycFailed
                      ? "Verification was completed, but the face match score is below the required threshold. Please retry verification."
                      : "The applicant must complete identity verification before the application can proceed. This includes document verification, liveness check, and face matching."}
              </p>

              {kycStatus !== "idle" && (
                <Badge
                  className="mt-3 bg-orange-500 text-white"
                  variant={isKycPassed ? "default" : "secondary"}
                >
                  {isKycPassed
                    ? "Completed"
                    : kycStatus === "pending"
                      ? "In Progress"
                      : "Review Needed"}
                </Badge>
              )}

              {kycStatus === "completed" && (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Overall Status:</span> {kycOverallStatus || "N/A"}</p>
                  <p><span className="font-medium text-foreground">ID Verification:</span> {kycIdVerificationStatus || "N/A"}</p>
                  <p><span className="font-medium text-foreground">Liveness:</span> {kycLivenessStatus || "N/A"}</p>
                  <p><span className="font-medium text-foreground">Liveness Score:</span> {kycLivenessScore ?? "N/A"}</p>
                  <p><span className="font-medium text-foreground">Face Match:</span> {kycFaceMatchStatus || "N/A"}</p>
                  <p><span className="font-medium text-foreground">Similarity Score:</span> {numericFaceMatchScore ?? "N/A"}%</p>

                  {isKycFailed && (
                    <p className="pt-2 font-medium text-red-600">
                      Face match score must be at least {MIN_FACE_MATCH_SCORE}% before you can proceed to the next step.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {kycStatus === "idle" && (
              <Button
                type="button"
                onClick={handleStartKyc}
                className="gap-2 bg-red-600"
                disabled={disabled || kycLoading}
              >
                <ShieldCheck className="h-4 w-4" />
                {kycLoading ? "Creating session..." : "Start Verification"}
              </Button>
            )}

            {kycStatus === "pending" && (
              <Button type="button" variant="outline" disabled className="gap-2">
                Verifying...
              </Button>
            )}

            {isKycPassed && (
              <Button type="button" variant="outline" className="gap-2" disabled>
                Verified
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {isKycFailed && (
              <Button
                type="button"
                onClick={handleStartKyc}
                className="gap-2 bg-red-600"
                disabled={disabled || kycLoading}
              >
                <ShieldCheck className="h-4 w-4" />
                {kycLoading ? "Creating session..." : "Retry Verification"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KycVerificationCard;
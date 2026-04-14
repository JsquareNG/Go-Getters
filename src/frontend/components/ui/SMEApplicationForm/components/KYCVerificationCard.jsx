import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { livenessDetectionApi } from "@/api/livenessDetectionApi";
import { getThreshold } from "@/api/riskConfigListApi";
import { mapIsoToNationalityOption } from "../utils/countries";

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

// const MIN_FACE_MATCH_SCORE = 60;

const KycVerificationCard = ({
  data,
  applicationId,
  disabled = false,
  onFieldChange,
  onPersistKycResult,
}) => {
  const [minFaceMatchScore, setMinFaceMatchScore] = useState(0); // fallback

  const processedDiditSessionRef = useRef("");
  const latestKycDataRef = useRef(DEFAULT_KYC_DATA);
  const retryingSessionRef = useRef(false);

  const kycData = data?.kyc || data?.kycData || DEFAULT_KYC_DATA;
  const kycStatus = kycData.status || "idle";
  const kycLoading = kycData.loading || false;
  const kycOverallStatus = kycData.overallStatus || "";
  const kycIdVerificationStatus = kycData.idVerificationStatus || "";
  const kycLivenessStatus = kycData.livenessStatus || "";
  const kycLivenessScore = kycData.livenessScore ?? null;
  const kycFaceMatchStatus = kycData.faceMatchStatus || "";
  const kycFaceMatchScore = kycData.faceMatchScore ?? null;

  // set threshold for liveness detection
  useEffect(() => {
    const fetchMinFaceMatchScore = async () => {
      try {
        const data = await getThreshold("Face Match");

        if (data?.item_value != null) {
          setMinFaceMatchScore(Number(data.item_value));
        }
      } catch (error) {
        console.error("Error fetching MIN_FACE_MATCH_SCORE:", error);
      }
    };

    fetchMinFaceMatchScore();
  }, []);

  const numericFaceMatchScore =
    kycFaceMatchScore === null || kycFaceMatchScore === undefined
      ? null
      : Number(kycFaceMatchScore);

  const normalizedOverall = String(kycOverallStatus || "")
    .trim()
    .toLowerCase();
  const normalizedStatus = String(kycStatus || "")
    .trim()
    .toLowerCase();

  const isKycIdle = normalizedStatus === "idle";

  const canRetryKyc =
    !disabled &&
    (normalizedStatus === "pending" ||
      (normalizedStatus === "completed" && normalizedOverall === "declined"));

  const isKycPending = normalizedStatus === "pending";
  const isKycDeclined =
    normalizedStatus === "completed" && normalizedOverall === "declined";
  const isKycApproved =
    normalizedStatus === "completed" && normalizedOverall === "approved";

  useEffect(() => {
    latestKycDataRef.current = kycData;
  }, [kycData]);

  const writeKycData = (nextValue) => {
    latestKycDataRef.current = nextValue;
    onFieldChange("kyc", nextValue);
    console.log("[KYC CARD] writeKycData:", nextValue);
  };

  const patchKycData = (patch) => {
    const nextValue = {
      ...DEFAULT_KYC_DATA,
      ...(latestKycDataRef.current || {}),
      ...patch,
    };

    latestKycDataRef.current = nextValue;
    onFieldChange("kyc", nextValue);
  };

  const hasFinalDecision =
    !!kycOverallStatus ||
    !!kycIdVerificationStatus ||
    !!kycLivenessStatus ||
    !!kycFaceMatchStatus;

  const resolvedKycStatus =
    kycStatus === "completed" || hasFinalDecision ? "completed" : kycStatus;

  const getKycStorageKey = (sessionId) => `kyc:${sessionId}`;

  const saveKycToSessionStorage = (sessionId, value) => {
    if (!sessionId) return;
    try {
      sessionStorage.setItem(
        getKycStorageKey(sessionId),
        JSON.stringify(value),
      );
    } catch (err) {
      console.error("Failed to save KYC to sessionStorage:", err);
    }
  };

  const loadKycFromSessionStorage = (sessionId) => {
    if (!sessionId) return null;
    try {
      const raw = sessionStorage.getItem(getKycStorageKey(sessionId));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error("Failed to read KYC from sessionStorage:", err);
      return null;
    }
  };

  const clearKycFromSessionStorage = (sessionId) => {
    if (!sessionId) return;
    try {
      sessionStorage.removeItem(getKycStorageKey(sessionId));
    } catch (err) {
      console.error("Failed to clear KYC from sessionStorage:", err);
    }
  };

  const mapDiditToFormFields = (diditData) => {
    const idv = diditData?.id_verifications?.[0] || {};

    return {
      fullName: idv?.full_name || "",
      idNumber: idv?.document_number || "",
      dateOfBirth: idv?.date_of_birth || "",
      residentialAddress: idv?.formatted_address || "",
      nationality: mapIsoToNationalityOption(idv?.issuing_state || null),
    };
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

  const buildKycSummary = (
    diditData,
    verificationSessionId,
    returnedStatus,
  ) => {
    const idv = diditData?.id_verifications?.[0] || {};
    const live = diditData?.liveness_checks?.[0] || {};
    const face = diditData?.face_matches?.[0] || {};

    return {
      status: "completed",
      loading: false,
      sessionId: verificationSessionId,
      overallStatus: diditData?.status || returnedStatus || "",
      idVerificationStatus: idv?.status || "",
      livenessStatus: live?.status || "",
      livenessScore: live?.score ?? null,
      faceMatchStatus: face?.status || "",
      faceMatchScore: face?.score ?? null,
    };
  };

  const handleStartKyc = async () => {
    retryingSessionRef.current = true;

    const previousSessionId =
      data?.provider_session_id ||
      data?.providerSessionId ||
      kycData?.sessionId;

    clearKycFromSessionStorage(previousSessionId);
    processedDiditSessionRef.current = "";
    restoredSessionRef.current = "";

    // writeKycData({
    //   ...DEFAULT_KYC_DATA,
    //   status: "idle",
    //   loading: true,
    //   sessionId: "",
    // });
    writeKycData({
      ...DEFAULT_KYC_DATA,
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
      const resolvedApplicationId = applicationId || "";
      const callbackUrl = window.location.href.split("?")[0];

      const payload = resolvedApplicationId
        ? { application_id: resolvedApplicationId, callback_url: callbackUrl }
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
      const nextSessionId = result.session_id || "";

      onFieldChange("provider_session_id", nextSessionId);

      const nextPendingState = {
        ...DEFAULT_KYC_DATA,
        status: "pending",
        loading: false,
        sessionId: nextSessionId,
      };

      writeKycData(nextPendingState);
      saveKycToSessionStorage(nextSessionId, nextPendingState);

      retryingSessionRef.current = false;
      // patchKycData({
      //   sessionId: nextSessionId,
      // });

      // onFieldChange("provider_session_id", nextSessionId);

      // saveKycToSessionStorage(nextSessionId, {
      //   ...DEFAULT_KYC_DATA,
      //   status: "pending",
      //   loading: false,
      //   sessionId: nextSessionId,
      // });

      if (result.verification_url) {
        // writeKycData({
        //   ...DEFAULT_KYC_DATA,
        //   status: "pending",
        //   loading: false,
        //   sessionId: nextSessionId,
        // });

        window.location.href = result.verification_url;
      } else {
        writeKycData({
          ...DEFAULT_KYC_DATA,
          status: "idle",
          loading: false,
        });
        alert("No verification_url returned. Check console and backend logs.");
      }
    } catch (error) {
      console.error("Start KYC frontend error:", error);
      retryingSessionRef.current = false;

      writeKycData({
        ...DEFAULT_KYC_DATA,
        status: "idle",
        loading: false,
      });
    }
  };

  // Restore already-saved KYC state after reload
  const restoredSessionRef = useRef("");
  useEffect(() => {
    if (retryingSessionRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const callbackSessionId = params.get("verificationSessionId");
    const existingSessionId =
      callbackSessionId ||
      data?.provider_session_id ||
      data?.providerSessionId ||
      kycData?.sessionId ||
      "";

    // let the callback-processing effect handle this case
    if (callbackSessionId) return;
    if (!existingSessionId) return;
    if (restoredSessionRef.current === existingSessionId) return;

    restoredSessionRef.current = existingSessionId;

    const restoreAndRefresh = async () => {
      const cached = loadKycFromSessionStorage(existingSessionId);
      if (cached) {
        writeKycData(cached);
      }

      if (!data?.provider_session_id && !data?.providerSessionId) {
        onFieldChange("provider_session_id", existingSessionId);
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/didit/session/${existingSessionId}/decision`,
        );

        if (!response.ok) throw new Error("Failed to refresh Didit decision.");

        const diditData = await response.json();
        const nextKycData = buildKycSummary(
          diditData,
          existingSessionId,
          diditData?.status,
        );

        writeKycData(nextKycData);
        saveKycToSessionStorage(existingSessionId, nextKycData);

        const payload = mapDiditToPayload(diditData);

        // try {
        //   await livenessDetectionApi(payload);
        // } catch (err) {
        //   console.error("[KYC] failed to persist liveness detection:", err);
        // }

        const mappedFields = mapDiditToFormFields(diditData);

        if (onPersistKycResult) {
          await onPersistKycResult({
            provider_session_id: existingSessionId,
            kycData: nextKycData,
            diditPayload: payload,
            mappedFields,
          });
        }
      } catch (err) {
        console.error("[KYC RESTORE] refresh failed:", err);
      }
    };

    restoreAndRefresh();
  }, [data?.provider_session_id, data?.providerSessionId, kycData?.sessionId]);

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
        const pendingState = {
          ...DEFAULT_KYC_DATA,
          ...(latestKycDataRef.current || {}),
          loading: true,
          sessionId: verificationSessionId,
        };

        // updateKycData(pendingState);
        writeKycData(pendingState);
        saveKycToSessionStorage(verificationSessionId, pendingState);

        onFieldChange("provider_session_id", verificationSessionId);

        const response = await fetch(
          `http://127.0.0.1:8000/didit/session/${verificationSessionId}/decision`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch Didit decision.");
        }

        const diditData = await response.json();
        const nextKycData = buildKycSummary(
          diditData,
          verificationSessionId,
          returnedStatus,
        );

        // updateKycData(nextKycData);
        writeKycData(nextKycData);
        saveKycToSessionStorage(verificationSessionId, nextKycData);

        // const payload = mapDiditToPayload(diditData);
        // await livenessDetectionApi(payload);

        // const mappedFields = mapDiditToFormFields(diditData);

        // console.log(
        //   "[KYC CARD] onPersistKycResult exists?",
        //   !!onPersistKycResult,
        // );
        // if (onPersistKycResult) {
        //   await onPersistKycResult({
        //     provider_session_id: verificationSessionId,
        //     kycData: nextKycData,
        //     diditPayload: payload,
        //     mappedFields,
        //   });
        // }
        const payload = mapDiditToPayload(diditData);

        // try {
        //   await livenessDetectionApi(payload);
        // } catch (err) {
        //   console.error("[KYC] failed to persist liveness detection:", err);
        // }

        const mappedFields = mapDiditToFormFields(diditData);

        if (onPersistKycResult) {
          try {
            await onPersistKycResult({
              provider_session_id: verificationSessionId,
              kycData: nextKycData,
              diditPayload: payload,
              mappedFields,
            });
          } catch (err) {
            console.error("[KYC] onPersistKycResult failed:", err);
          }
        }
      } catch (error) {
        console.error("Error processing Didit return:", error);

        // const failedState = {
        //   ...DEFAULT_KYC_DATA,
        //   ...(latestKycDataRef.current || {}),
        //   status: "idle",
        //   loading: false,
        //   sessionId: verificationSessionId,
        // };

        // writeKycData(failedState);
        const current = latestKycDataRef.current || DEFAULT_KYC_DATA;

        writeKycData({
          ...current,
          loading: false,
          sessionId: verificationSessionId,
        });
      }
    };

    processDiditReturn();
  }, [onFieldChange, onPersistKycResult]);

  return (
    <Card
      className={`mb-6 border-1 transition-colors ${
        isKycApproved
          ? "border-[hsl(var(--status-approved))]/30 bg-[hsl(var(--status-approved))]/5"
          : isKycPending
            ? "border-[hsl(var(--status-in-review))]/30 bg-[hsl(var(--status-in-review))]/5"
            : isKycDeclined
              ? "border-red-200 bg-red-50"
              : "border-border"
      }`}
    >
      {!isKycApproved && (
        <div className="mt-3 mx-7 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          KYC verification is mandatory. This applicant must complete and pass
          verification before the application can proceed.
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isKycApproved
                  ? "bg-[hsl(var(--status-approved))]/15"
                  : isKycPending
                    ? "bg-[hsl(var(--status-in-review))]/15"
                    : isKycDeclined
                      ? "bg-red-100"
                      : "bg-primary/10"
              }`}
            >
              <ShieldCheck
                className={`h-6 w-6 ${
                  isKycApproved
                    ? "text-[hsl(var(--status-approved))]"
                    : isKycPending
                      ? "text-[hsl(var(--status-in-review))]"
                      : isKycDeclined
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
                {isKycApproved
                  ? "Verification completed successfully. You can proceed with the application."
                  : isKycPending
                    ? "Verification is in progress. Waiting for the applicant to complete the process."
                    : isKycDeclined
                      ? "Verification was completed, but the face match score is below the required threshold. Please retry verification."
                      : "The applicant must complete identity verification before the application can proceed. This includes document verification, liveness check, and face matching."}
              </p>

              {!isKycPending && (
                <Badge
                  className="mt-3 bg-orange-500 text-white"
                  variant={isKycApproved ? "default" : "secondary"}
                >
                  {isKycApproved
                    ? "Completed"
                    : isKycPending
                      ? "In Progress"
                      : "Review Needed"}
                </Badge>
              )}

              {kycStatus === "completed" && (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      Overall Status:
                    </span>{" "}
                    {kycOverallStatus || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      ID Verification:
                    </span>{" "}
                    {kycIdVerificationStatus || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Liveness:
                    </span>{" "}
                    {kycLivenessStatus || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Liveness Score:
                    </span>{" "}
                    {kycLivenessScore ?? "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Face Match:
                    </span>{" "}
                    {kycFaceMatchStatus || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Similarity Score:
                    </span>{" "}
                    {numericFaceMatchScore ?? "N/A"}%
                  </p>

                  {isKycDeclined && (
                    <p className="pt-2 font-medium text-red-600">
                      Face match score must be at least {minFaceMatchScore}%
                      before you can proceed to the next step.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {isKycIdle && (
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

            {(isKycPending || isKycDeclined) && (
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

            {isKycApproved && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled
              >
                Verified
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {/* {isKycDeclined && (
              <Button
                type="button"
                onClick={handleStartKyc}
                className="gap-2 bg-red-600"
                disabled={disabled || kycLoading}
              >
                <ShieldCheck className="h-4 w-4" />
                {kycLoading ? "Creating session..." : "Retry Verification"}
              </Button>
            )} */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KycVerificationCard;

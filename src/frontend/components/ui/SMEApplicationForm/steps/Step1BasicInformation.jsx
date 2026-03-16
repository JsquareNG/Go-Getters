import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import SINGAPORE_CONFIG2 from "../config/updatedSingaporeConfig";
import { Card, CardContent } from "../../primitives/Card";
import { Button } from "../../primitives/Button";
import { Badge } from "../../primitives/Badge";
import { Separator } from "../../primitives/Separator";
import { livenessDetectionApi } from "../../../../api/livenessDetectionApi";

const ACRA_WITH_TABLES_ENDPOINT =
  "http://127.0.0.1:8000/document-ai/extract-acra-bizprofile";

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

const Step1BasicInformation = ({ data, onFieldChange, disabled = false }) => {
  const fileRef = useRef(null);
  const processedDiditSessionRef = useRef("");
  const latestKycDataRef = useRef(DEFAULT_KYC_DATA);

  const [acraFile, setAcraFile] = useState(null);
  const [acraUploading, setAcraUploading] = useState(false);
  const [acraError, setAcraError] = useState("");
  const [acraSuccessMsg, setAcraSuccessMsg] = useState("");

  const kycData = data?.kycData || DEFAULT_KYC_DATA;
  const kycStatus = kycData.status || "idle";
  const kycLoading = kycData.loading || false;
  const kycSessionId = kycData.sessionId || "";
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

  const { basicFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = SINGAPORE_CONFIG2.entities[data?.businessType] || {};
    const step2 = entity.steps?.find((s) => s.id === "step2") || {};

    const basicFields = {};
    const repeatableSections = {};

    if (step2.fields) {
      Object.entries(step2.fields).forEach(([key, val]) => {
        basicFields[key] = { ...val };
      });
    }

    if (step2.repeatableSections) {
      Object.entries(step2.repeatableSections).forEach(
        ([sectionKey, section]) => {
          repeatableSections[sectionKey] = {
            label: section.label,
            min: section.min,
            max: section.max,
            fields: { ...section.fields },
          };
        },
      );
    }

    return {
      basicFieldsConfig: basicFields,
      repeatableSectionsConfig: repeatableSections,
    };
  }, [data?.businessType]);

  const handleChooseAcra = () => fileRef.current?.click();

  const handleAcraFileChange = (e) => {
    setAcraError("");
    setAcraSuccessMsg("");
    const file = e.target.files?.[0];
    if (file) setAcraFile(file);
    e.target.value = "";
  };

  const handleAutofillAcra = async () => {
    setAcraError("");
    setAcraSuccessMsg("");

    if (data?.country !== "SG") return;
    if (!acraFile) return setAcraError("Please upload your ACRA PDF first.");
    if (acraFile.type !== "application/pdf") {
      return setAcraError("Only PDF is allowed.");
    }

    setAcraUploading(true);

    try {
      const formDataApi = new FormData();
      formDataApi.append("file", acraFile);

      const res = await fetch(ACRA_WITH_TABLES_ENDPOINT, {
        method: "POST",
        body: formDataApi,
      });

      if (!res.ok) throw new Error("Autofill failed");

      const result = await res.json();
      console.log("FULL API RESPONSE:", result);

      const rawKv = result?.data?.data || {};
      const kv = {};
      Object.keys(rawKv).forEach((k) => {
        kv[k.toLowerCase().trim()] = rawKv[k];
      });

      const ownerName = result?.data?.data?.owners?.name || "";
      const ownerId = result?.data?.data?.owners?.id_number || "";

      const setIfEmpty = (key, value) => {
        if (!(key in basicFieldsConfig)) return;
        if (!value) return;

        const next = String(value).trim();
        if (!next) return;

        const current = data?.[key] ?? "";
        if (!current || String(current).trim() === "") {
          onFieldChange?.(key, next);
        }
      };

      const ddMmmYyyyToISO = (s) => {
        if (!s) return "";
        const m = String(s)
          .trim()
          .match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
        if (!m) return "";

        const months = {
          JAN: "01",
          FEB: "02",
          MAR: "03",
          APR: "04",
          MAY: "05",
          JUN: "06",
          JUL: "07",
          AUG: "08",
          SEP: "09",
          OCT: "10",
          NOV: "11",
          DEC: "12",
        };

        const day = m[1].padStart(2, "0");
        const mm = months[m[2].toUpperCase()];
        return `${m[3]}-${mm}-${day}`;
      };

      const normalizeStatus = (s) => {
        if (!s) return "";
        const v = String(s).trim().toUpperCase();
        if (v === "LIVE" || v === "ACTIVE") return "Active";
        if (v === "INACTIVE") return "Inactive";
        if (v === "DISSOLVED") return "Dissolved";
        if (v === "LIQUIDATED") return "Liquidated";
        if (v === "IN RECEIVERSHIP") return "InReceivership";
        if (v === "STRUCK OFF") return "StruckOff";
        return "";
      };

      setIfEmpty("businessName", kv["name"]);
      setIfEmpty("registeredAddress", kv["address"]);

      const isoDate = ddMmmYyyyToISO(
        kv["registration_date"] || kv["commencement date"],
      );
      if (isoDate) setIfEmpty("registrationDate", isoDate);

      const mappedStatus = normalizeStatus(kv["status"]);
      if (mappedStatus) setIfEmpty("businessStatus", mappedStatus);

      setIfEmpty("uen", kv["uen"]);
      if (ownerName) setIfEmpty("fullName", ownerName);
      if (ownerId) setIfEmpty("idNumber", ownerId);

      setAcraSuccessMsg("Autofill completed. Please review before proceeding.");
    } catch (err) {
      setAcraError(err?.message || "Failed to autofill.");
    } finally {
      setAcraUploading(false);
    }
  };

  const handleStartKyc = async () => {
    console.log("Start KYC button clicked");

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
        data?.application_id ||
        data?.applicationId ||
        data?.appId ||
        "";

      const callbackUrl = window.location.href.split("?")[0];

      const payload = applicationId
        ? {
            application_id: applicationId,
            callback_url: callbackUrl,
          }
        : {
            callback_url: callbackUrl,
          };

      console.log("KYC payload being sent:", payload);

      const response = await fetch("http://127.0.0.1:8000/didit/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Backend response status:", response.status);

      if (!response.ok) {
        throw new Error("Failed to create Didit session.");
      }

      const result = await response.json();
      console.log("Backend response data:", result);

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
        alert("No verification_url returned. Check console and backend logs.");
        updateKycData({ status: "idle", loading: false });
      }
    } catch (error) {
      console.error("Start KYC frontend error:", error);
      updateKycData({ status: "idle", loading: false });
    } finally {
      updateKycData({ loading: false });
    }
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
        console.log("Didit decision:", diditData);

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

  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") {
      console.error("Invalid field name:", name);
      return;
    }

    onFieldChange(name, value);
  };

  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  };

  const handleDocumentChange = (fieldPath, file) => {
    if (!fieldPath) {
      console.error("Invalid document field:", fieldPath);
      return;
    }

    handleFieldChange(fieldPath, {
      file,
      progress: 0,
    });
  };

  const getVisibleConditionalFields = (fieldCfg, value) => {
    if (!fieldCfg.conditionalFields) return {};
    return fieldCfg.conditionalFields[value] || {};
  };

  const renderField = (fieldName, fieldCfg, parentKey = null) => {
    const fullKey = parentKey ? `${parentKey}.${fieldName}` : fieldName;
    const value = parentKey
      ? data?.[parentKey]?.[fieldName]
      : data?.[fieldName];

    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={fullKey} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldName.replace(/([A-Z])/g, " $1").trim()}
          </p>
          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderField(subKey, subCfg, fullKey),
          )}
        </div>
      );
    }

    if (fieldCfg.type === "file") {
      return (
        <FileUploadField
          key={fullKey}
          fieldName={fullKey}
          label={fieldCfg.label}
          file={getNestedValue(data, fullKey) || null}
          onChange={(file) => handleDocumentChange(fullKey, file)}
          required={fieldCfg.required || false}
          acceptTypes="application/pdf,image/jpeg,image/png"
          placeholder={fieldCfg.placeholder || ""}
          maxSize={5242880}
          disabled={disabled}
        />
      );
    }

    const fieldElement = (
      <FormFieldGroup
        key={fullKey}
        fieldName={fullKey}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value || ""}
        onChange={onFieldChange}
        type={fieldCfg.type || "text"}
        options={fieldCfg.options || []}
        required={fieldCfg.required || false}
        disabled={disabled}
      />
    );

    if (fieldCfg.conditionalFields && value != null) {
      const visibleFields = getVisibleConditionalFields(fieldCfg, value);
      const conditionalElements = Object.entries(visibleFields).map(
        ([condKey, condCfg]) => renderField(condKey, condCfg, parentKey),
      );
      return (
        <div key={fullKey}>
          {fieldElement}
          <div className="ml-4 mt-2">{conditionalElements}</div>
        </div>
      );
    }

    return fieldElement;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      <Card
        className={`mb-6 border-2 transition-colors ${
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
                    className="mt-3"
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

      <Separator className="my-8" />

      {data?.country === "SG" && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Autofill with ACRA business profile
              </p>
              <p className="text-xs text-gray-500">
                Upload ACRA Business Profile (PDF), then click Autofill.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleChooseAcra}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                disabled={acraUploading}
              >
                Upload PDF
              </button>

              <button
                type="button"
                onClick={handleAutofillAcra}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  acraUploading ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={acraUploading}
              >
                {acraUploading ? "Autofilling..." : "Autofill"}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleAcraFileChange}
              />
            </div>
          </div>

          <div className="mt-3 text-xs">
            {acraFile?.name && (
              <p className="text-gray-600">
                Selected: <span className="font-medium">{acraFile.name}</span>
              </p>
            )}
            {acraError && <p className="mt-1 text-red-600">{acraError}</p>}
            {acraSuccessMsg && (
              <p className="mt-1 text-green-600">{acraSuccessMsg}</p>
            )}
          </div>
        </div>
      )}

      {Object.entries(basicFieldsConfig).map(([fieldName, fieldConfig]) =>
        renderField(fieldName, fieldConfig),
      )}

      {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => (
        <div key={sectionKey} className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {section.label}
          </h3>
          {Object.entries(section.fields).map(([fieldName, fieldConfig]) =>
            renderField(fieldName, fieldConfig),
          )}
        </div>
      ))}
    </div>
  );
};

export default Step1BasicInformation;
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
// import SINGAPORE_CONFIG from "../config/singaporeConfig";
import SINGAPORE_CONFIG2 from "../config/updatedSingaporeConfig";
// import { extractFieldsFromStep, resolveConditionalFields, isFieldVisible } from "../utils/extractFields";
import { Card, CardContent } from "../../primitives/Card";
import { Button } from "../../primitives/Button";
import { Badge } from "../../primitives/Badge";
import { Separator } from "../../primitives/Separator";
import { livenessDetectionApi } from "../../../../api/livenessDetectionApi";

const ACRA_WITH_TABLES_ENDPOINT =
  "http://127.0.0.1:8000/document-ai/extract-acra-bizprofile";

const Step1BasicInformation = ({ data, onFieldChange, disabled = false }) => {
  const fileRef = useRef(null);

  const [acraFile, setAcraFile] = useState(null);
  const [acraUploading, setAcraUploading] = useState(false);
  const [acraError, setAcraError] = useState("");
  const [acraSuccessMsg, setAcraSuccessMsg] = useState("");

  const [kycStatus, setKycStatus] = useState("idle");
  const [kycLoading, setKycLoading] = useState(false);
  const [kycSessionId, setKycSessionId] = useState("");
  const [kycOverallStatus, setKycOverallStatus] = useState("");
  const [kycFaceMatchScore, setKycFaceMatchScore] = useState(null);
  const [kycLivenessScore, setKycLivenessScore] = useState(null);
  const [kycIdVerificationStatus, setKycIdVerificationStatus] = useState("");
  const [kycFaceMatchStatus, setKycFaceMatchStatus] = useState("");
  const [kycLivenessStatus, setKycLivenessStatus] = useState("");

  // ---- dynamic config from singaporeConfig ----
  const { basicFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = SINGAPORE_CONFIG2.entities[data?.businessType] || {};
    // const entity = SINGAPORE_CONFIG2?.entities?.[data?.businessType] || {};
    const step2 = entity.steps?.find((s) => s.id === "step2") || {};
    // const step2 = Array.isArray(entity.steps)
    //   ? entity.steps.find((s) => s.id === "step2")
    //   : {};

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

  // ---- ACRA Upload Handlers ----
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
    if (acraFile.type !== "application/pdf")
      return setAcraError("Only PDF is allowed.");

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

      // const ownerName = result?.data?.owner?.owner_name || "";
      // const ownerId = result?.data?.owner?.identification_number || "";
      const ownerName = result?.data?.data?.owners?.name || "";
      const ownerId = result?.data?.data?.owners?.id_number || "";

      // ---- helpers ----
      const setIfEmpty = (key, value) => {
        if (!(key in basicFieldsConfig)) return;
        if (!value) return;
        const next = String(value).trim();
        if (!next) return;
        const current = data?.[key] ?? "";
        if (!current || String(current).trim() === "") {
          onFieldChange?.(key, next); // direct Redux update
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

      // ---- map ACRA → Redux ----
      setIfEmpty(
        "businessName",
        // kv["name of business"] || kv["name of company"],
        kv["name"],
      );
      // setIfEmpty("registeredAddress", kv["principal place of business"]);
      setIfEmpty("registeredAddress", kv["address"]);

      const isoDate = ddMmmYyyyToISO(
        kv["registration_date"] || kv["commencement date"],
      );
      if (isoDate) setIfEmpty("registrationDate", isoDate);
      const mappedStatus = normalizeStatus(
        // kv["status of business"] || kv["status of company"],
        kv["status"]
      );
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

    setKycLoading(true);

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

      const response = await fetch(
        "http://127.0.0.1:8000/didit/create-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      console.log("Backend response status:", response.status);

      const result = await response.json();
      console.log("Backend response data:", result);

      setKycSessionId(result.session_id || "");

      if (result.verification_url) {
        setKycStatus("pending");
        window.location.href = result.verification_url;
      } else {
        alert("No verification_url returned. Check console and backend logs.");
        setKycStatus("idle");
      }
    } catch (error) {
      console.error("Start KYC frontend error:", error);
      setKycStatus("idle");
    } finally {
      setKycLoading(false);
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
    const params = new URLSearchParams(window.location.search);
    const verificationSessionId = params.get("verificationSessionId");
    const returnedStatus = params.get("status");

    if (!verificationSessionId) return;

    const processDiditReturn = async () => {
      try {
        setKycLoading(true);
        setKycSessionId(verificationSessionId);

        const response = await fetch(
          `http://127.0.0.1:8000/didit/session/${verificationSessionId}/decision`
        );

        const diditData = await response.json();
        console.log("Didit decision:", diditData);

        const idv = diditData?.id_verifications?.[0] || {};
        const live = diditData?.liveness_checks?.[0] || {};
        const face = diditData?.face_matches?.[0] || {};

        setKycOverallStatus(diditData?.status || returnedStatus || "");
        setKycIdVerificationStatus(idv?.status || "");
        setKycLivenessStatus(live?.status || "");
        setKycLivenessScore(live?.score ?? null);
        setKycFaceMatchStatus(face?.status || "");
        setKycFaceMatchScore(face?.score ?? null);
        setKycStatus("completed");

        const payload = mapDiditToPayload(diditData);
        await livenessDetectionApi(payload);

        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error("Error processing Didit return:", error);
      } finally {
        setKycLoading(false);
      }
    };

    processDiditReturn();
  }, []);

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

  const setNestedValue = (obj, path, value) => {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const newObj = { ...obj };
    let ref = newObj;

    keys.forEach((key) => {
      if (!ref[key]) ref[key] = {};
      ref[key] = { ...ref[key] };
      ref = ref[key];
    });

    ref[lastKey] = value;
    return newObj;
  };

  // const handleDocumentChange = (fieldPath, file) => {
  //   if (!fieldPath || !file) return;

  //   // Store metadata in Redux
  //   const fileMeta = {
  //     fileName: file.name,
  //     fileType: file.type,
  //     size: file.size,
  //     progress: 0,
  //   };

  //   const updatedData = setNestedValue(data, fieldPath, fileMeta);

  //   onFieldChange("", updatedData); // Redux update

  // };

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

  //HELPER
  const getVisibleConditionalFields = (fieldCfg, value) => {
    if (!fieldCfg.conditionalFields) return {};
    return fieldCfg.conditionalFields[value] || {};
  };

  // ---- Generic field renderer (recursive for nested fields) ----
  const renderField = (fieldName, fieldCfg, parentKey = null) => {
    const fullKey = parentKey ? `${parentKey}.${fieldName}` : fieldName;
    const value = parentKey
      ? data?.[parentKey]?.[fieldName]
      : data?.[fieldName];

    // Nested object
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

    // File field
    if (fieldCfg.type === "file") {
      return (
        <FileUploadField
          key={fullKey}
          fieldName={fullKey}
          label={fieldCfg.label}
          // file={data?.[fullKey] || null} // <- must match your Redux structure
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

    // // Regular field
    // return (
    //   <FormFieldGroup
    //     key={fullKey}
    //     fieldName={fullKey}
    //     label={fieldCfg.label}
    //     placeholder={fieldCfg.placeholder || ""}
    //     value={value || ""}
    //     onChange={onFieldChange}
    //     type={fieldCfg.type || "text"}
    //     options={fieldCfg.options || []}
    //     required={fieldCfg.required || false}
    //     disabled={disabled}
    //   />
    // );

    // Regular field (text/select/etc.)
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

    // Render conditional fields if any
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
  // ---- Helper to render a field or file field ----
  // const renderField = (fieldName, fieldConfig) => {
  //   if (fieldConfig.type === "file") {
  //     return (
  //       <FileUploadField
  //         key={fieldName}
  //         fieldName={fieldName}
  //         label={fieldConfig.label}
  //         file={data[fieldName]?.file || null}
  //         onChange={(file) => handleDocumentChange(fieldName, {file})}
  //         required={fieldConfig.required || false}
  //         acceptTypes="application/pdf,image/jpeg,image/png"
  //         placeholder={fieldConfig.placeholder || ""}
  //         maxSize={5242880}
  //         disabled={disabled}
  //       />
  //     );
  //   }

  //   return (
  //     <FormFieldGroup
  //       key={fieldName}
  //       fieldName={fieldName}
  //       label={fieldConfig.label}
  //       placeholder={fieldConfig.placeholder || ""}
  //       value={data[fieldName] || ""}
  //       onChange={onFieldChange}
  //       type={fieldConfig.type || "text"}
  //       options={fieldConfig.options || []}
  //       required={fieldConfig.required || false}
  //       disabled={disabled}
  //     />
  //   );
  // };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      {/* KYC Verification Card */}
      <Card className={`mb-6 border-2 transition-colors ${
        kycStatus === "completed"
          ? "border-[hsl(var(--status-approved))]/30 bg-[hsl(var(--status-approved))]/5"
          : kycStatus === "pending"
            ? "border-[hsl(var(--status-in-review))]/30 bg-[hsl(var(--status-in-review))]/5"
            : "border-border"
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                kycStatus === "completed"
                  ? "bg-[hsl(var(--status-approved))]/15"
                  : kycStatus === "pending"
                    ? "bg-[hsl(var(--status-in-review))]/15"
                    : "bg-primary/10"
              }`}>
                <ShieldCheck className={`h-6 w-6 ${
                  kycStatus === "completed"
                    ? "text-[hsl(var(--status-approved))]"
                    : kycStatus === "pending"
                      ? "text-[hsl(var(--status-in-review))]"
                      : "text-primary"
                }`} />
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Identity Verification (KYC)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {kycStatus === "completed"
                    ? "Verification completed successfully. Review the returned KYC results below."
                    : kycStatus === "pending"
                      ? "Verification is in progress. Waiting for the applicant to complete the process."
                      : "The applicant must complete identity verification before the application can proceed. This includes document verification, liveness check, and face matching."
                  }
                </p>

                {kycStatus !== "idle" && (
                  <Badge
                    className="mt-3"
                    variant={kycStatus === "completed" ? "default" : "secondary"}
                  >
                    {kycStatus === "completed" ? "Completed" : "In Progress"}
                  </Badge>
                )}

                {kycStatus === "completed" && (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">Overall Status:</span> {kycOverallStatus || "N/A"}</p>
                    <p><span className="font-medium text-foreground">ID Verification:</span> {kycIdVerificationStatus || "N/A"}</p>
                    <p><span className="font-medium text-foreground">Liveness:</span> {kycLivenessStatus || "N/A"}</p>
                    <p><span className="font-medium text-foreground">Liveness Score:</span> {kycLivenessScore ?? "N/A"}</p>
                    <p><span className="font-medium text-foreground">Face Match:</span> {kycFaceMatchStatus || "N/A"}</p>
                    <p><span className="font-medium text-foreground">Similarity Score:</span> {kycFaceMatchScore ?? "N/A"}</p>
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

              {kycStatus === "completed" && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* ACRA Autofill */}
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

      {/* Top-Level Fields */}
      {/* {Object.entries(basicFieldsConfig).map(([fieldName, fieldConfig]) => (
        <FormFieldGroup
          key={fieldName}
          fieldName={fieldName}
          label={fieldConfig.label}
          placeholder={fieldConfig.placeholder || ""}
          value={data[fieldName] || ""}
          onChange={onFieldChange} // Redux-only
          type={fieldConfig.type || "text"}
          options={fieldConfig.options || []}
          required={fieldConfig.required || false}
          disabled={disabled}
        />
      ))} */}

      {/* Repeatable Sections */}
      {/* {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => (
        <div key={sectionKey} className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {section.label}
          </h3>

          {Object.entries(section.fields).map(([fieldName, fieldConfig]) => (
            <FormFieldGroup
              key={fieldName}
              fieldName={fieldName}
              label={fieldConfig.label}
              placeholder={fieldConfig.placeholder || ""}
              value={data[fieldName] || ""}
              onChange={onFieldChange} // Redux-only
              type={fieldConfig.type || "text"}
              options={fieldConfig.options || []}
              required={fieldConfig.required || false}
              disabled={disabled}
            />
          ))}
        </div>
      ))} */}

      {/* Top-Level Fields */}
      {Object.entries(basicFieldsConfig).map(([fieldName, fieldConfig]) =>
        renderField(fieldName, fieldConfig),
      )}

      {/* Repeatable Sections */}
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
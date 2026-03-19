import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import { Card, CardContent } from "../../primitives/Card";
import { Badge } from "../../primitives/Badge";
import { Separator } from "../../primitives/Separator";
import { livenessDetectionApi } from "../../../../api/livenessDetectionApi";
import { Button } from "@/components/ui";

import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";
import { allDocuments } from "@/api/documentApi";
import { extractProfileApi } from "@/api/ocrApi";

// const ACRA_WITH_TABLES_ENDPOINT =
//   "http://127.0.0.1:8000/document-ai/extract-acra-bizprofile";
const BUSINESS_PROFILE_EXTRACTORS = {
  Singapore: {
    title: "Autofill with Business Profile",
    helperText: "Upload the business profile / ACRA PDF, then click Autofill.",
  },
  Indonesia: {
    title: "Autofill with Business Profile",
    helperText:
      "Upload the registration / deed / incorporation PDF, then click Autofill.",
  },
};

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

const Step1BasicInformation = ({
  data,
  onFieldChange,
  disabled = false,
  applicationId,
}) => {
  const fileRef = useRef(null);
  const processedDiditSessionRef = useRef("");
  const latestKycDataRef = useRef(DEFAULT_KYC_DATA);

  const [existingDocuments, setExistingDocuments] = useState([]);

  useEffect(() => {
    if (!applicationId || applicationId === "new") return;

    const fetchDocs = async () => {
      try {
        const docs = await allDocuments(applicationId);
        console.log("STEP1 existing docs:", docs);
        setExistingDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to fetch documents", err);
        setExistingDocuments([]);
      }
    };

    fetchDocs();
  }, [applicationId]);

  const existingDocumentMap = useMemo(() => {
    return existingDocuments.reduce((acc, doc) => {
      acc[doc.document_type] = doc;
      return acc;
    }, {});
  }, [existingDocuments]);

  const hasUsableLocalFile = (value) => {
    return value instanceof File || value?.file instanceof File;
  };

  const [businessProfileFile, setBusinessProfileFile] = useState(null);
  const [businessProfileUploading, setBusinessProfileUploading] =
    useState(false);
  const [businessProfileError, setBusinessProfileError] = useState("");
  const [businessProfileSuccessMsg, setBusinessProfileSuccessMsg] =
    useState("");

  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

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
    const entity = activeConfig?.entities[data?.businessType] || {};
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
            storage: section.storage,
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
  }, [data?.businessType, data?.country]);

  // --- OCR ---
  const extractorConfig = BUSINESS_PROFILE_EXTRACTORS[data?.country] || null;

  const businessProfileFieldKey = useMemo(() => {
    const entry = Object.entries(basicFieldsConfig || {}).find(
      ([, fieldCfg]) =>
        fieldCfg?.type === "file" && fieldCfg?.ocrTarget === "business_profile",
    );

    return entry?.[0] || null;
  }, [basicFieldsConfig]);

  const businessProfileFieldConfig = useMemo(() => {
    if (!businessProfileFieldKey) return null;
    return basicFieldsConfig[businessProfileFieldKey];
  }, [basicFieldsConfig, businessProfileFieldKey]);

  const getFormDataRoot = () => {
    if (data?.formData && Object.keys(data.formData).length > 0) {
      return data.formData;
    }
    return data || {};
  };
  const getIndividuals = () => getFormDataRoot()?.individuals || [];
  const isIndividualsStorage = (sectionConfig) =>
    sectionConfig?.storage === "individuals";

  const getRoleValue = (sectionConfig, fallbackKey) => {
    return sectionConfig?.fields?.role?.value || fallbackKey;
  };

  const getNestedValue = (obj, path) => {
    if (!path) return undefined;
    return path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      const isIndex = !Number.isNaN(Number(key));
      return isIndex ? acc[Number(key)] : acc[key];
    }, obj);
  };

  const setNestedValue = (obj, path, value) => {
    const keys = path.split(".");
    const result = Array.isArray(obj) ? [...obj] : { ...obj };

    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      const isNextIndex = !Number.isNaN(Number(nextKey));

      current[key] =
        current[key] != null
          ? Array.isArray(current[key])
            ? [...current[key]]
            : { ...current[key] }
          : isNextIndex
            ? []
            : {};

      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  };

  // --- OCR ---
  const setIfEmpty = (key, value) => {
    if (!(key in basicFieldsConfig)) return;
    if (!value) return;

    const next = String(value).trim();
    if (!next) return;

    const current =
      getNestedValue(getFormDataRoot(), key) ?? getNestedValue(data, key) ?? "";

    if (!current || String(current).trim() === "") {
      onFieldChange(key, next);
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

  const mapBusinessProfileResultToForm = (result) => {
    const rawKv = result?.data?.data || {};
    const kv = {};

    Object.keys(rawKv).forEach((k) => {
      kv[k.toLowerCase().trim()] = rawKv[k];
    });

    const ownerName =
      result?.data?.data?.owners?.name || result?.data?.owner?.owner_name || "";

    const ownerId =
      result?.data?.data?.owners?.id_number ||
      result?.data?.owner?.identification_number ||
      "";

    setIfEmpty("businessName", kv["name"] || kv["business name"]);
    setIfEmpty(
      "registeredAddress",
      kv["address"] ||
        kv["registered address"] ||
        kv["principal place of business"],
    );

    const isoDate = ddMmmYyyyToISO(
      kv["registration_date"] ||
        kv["commencement date"] ||
        kv["date of registration"],
    );
    if (isoDate) setIfEmpty("registrationDate", isoDate);

    const mappedStatus = normalizeStatus(
      kv["status"] || kv["business status"] || kv["status of business"],
    );
    if (mappedStatus) setIfEmpty("businessStatus", mappedStatus);

    setIfEmpty("uen", kv["uen"]);
    setIfEmpty("nib", kv["nib"]);
    setIfEmpty(
      "businessRegistrationNumber",
      kv["uen"] || kv["nib"] || kv["registration number"],
    );
    setIfEmpty("npwp", kv["npwp"]);

    if (ownerName) setIfEmpty("fullName", ownerName);
    if (ownerId) setIfEmpty("idNumber", ownerId);
  };

  const handleChooseBusinessProfile = () => fileRef.current?.click();

  const handleBusinessProfileFileChange = (e) => {
    setBusinessProfileError("");
    setBusinessProfileSuccessMsg("");

    const file = e.target.files?.[0];
    if (file) {
      setBusinessProfileFile(file);

      if (businessProfileFieldKey) {
        onFieldChange(businessProfileFieldKey, { file, progress: 0 });
      }
    }

    e.target.value = "";
  };

  const handleAutofillBusinessProfile = async () => {
    setBusinessProfileError("");
    setBusinessProfileSuccessMsg("");

    if (!businessProfileFile) {
      setBusinessProfileError(
        "Please upload the business profile document first.",
      );
      return;
    }

    if (businessProfileFile.type !== "application/pdf") {
      setBusinessProfileError("Only PDF is allowed.");
      return;
    }

    setBusinessProfileUploading(true);

    try {
      const result = await extractProfileApi(businessProfileFile);
      console.log("BUSINESS PROFILE OCR RESPONSE:", result);

      mapBusinessProfileResultToForm(result);

      setBusinessProfileSuccessMsg(
        "Autofill completed. Please review before proceeding.",
      );
    } catch (err) {
      setAcraError(err?.message || "Failed to autofill.");
    } finally {
      setBusinessProfileUploading(false);
    }
  };

  // --- LIVENESS DETECTION ---
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
        data?.application_id || data?.applicationId || data?.appId || "";

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
        },
      );

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

  // --- SPECIFICALLY FOR INDIVIDUAL'S NESTING ---
  const buildIndividualDocumentType = (
    sectionKey,
    sectionConfig,
    rowIndex,
    fieldName,
  ) => {
    const roleValue = getRoleValue(sectionConfig, sectionKey);
    return `${roleValue}_${rowIndex + 1}_${fieldName}`;
  };

  const buildEmptyRow = (fieldsConfig = {}) => {
    const row = {};

    Object.entries(fieldsConfig).forEach(([fieldKey, fieldCfg]) => {
      if (fieldKey === "conditionalFields") return;

      if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
        row[fieldKey] = buildEmptyRow(fieldCfg);
        return;
      }

      if (fieldCfg?.value !== undefined) {
        row[fieldKey] = fieldCfg.value;
        return;
      }

      row[fieldKey] = null;
    });

    return row;
  };

  const getSectionRows = (sectionKey, sectionConfig) => {
    if (isIndividualsStorage(sectionConfig)) {
      const roleValue = getRoleValue(sectionConfig, sectionKey);
      return getIndividuals().filter((row) => row?.role === roleValue);
    }

    return Array.isArray(getFormDataRoot()?.[sectionKey])
      ? getFormDataRoot()[sectionKey]
      : [];
  };

  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") return;
    onFieldChange(name, value);
  };

  const handleSectionChange = (sectionKey, nextRows) => {
    onFieldChange(`formData.${sectionKey}`, nextRows);
  };

  const handleAddRepeatableRow = (sectionKey, sectionConfig) => {
    const currentRows = getSectionRows(sectionKey, sectionConfig);
    const max = sectionConfig?.max ?? Infinity;
    if (currentRows.length >= max) return;

    const nextRows = [...currentRows, buildEmptyRow(sectionConfig.fields)];
    handleSectionChange(sectionKey, nextRows);
  };

  const handleRemoveRepeatableRow = (sectionKey, index, sectionConfig) => {
    const currentRows = getSectionRows(sectionKey, sectionConfig);
    const min = sectionConfig?.min ?? 0;
    if (currentRows.length <= min) return;

    const nextRows = currentRows.filter((_, i) => i !== index);
    handleSectionChange(sectionKey, nextRows);
  };

  const handleIndividualFieldChange = (
    sectionKey,
    sectionConfig,
    rowIndex,
    fieldPath,
    value,
  ) => {
    const individuals = [...getIndividuals()];
    const roleValue = getRoleValue(sectionConfig, sectionKey);

    const matchingRows = individuals
      .map((person, originalIndex) => ({ person, originalIndex }))
      .filter(({ person }) => person?.role === roleValue);

    const target = matchingRows[rowIndex];
    if (!target) return;

    const originalRow = updatedClone(individuals[target.originalIndex]);
    const updatedRow = setNestedValue(originalRow, fieldPath, value);

    const updatedIndividuals = [...individuals];
    updatedIndividuals[target.originalIndex] = updatedRow;

    onFieldChange("formData.individuals", updatedIndividuals);
  };

  const updatedClone = (obj) => {
    if (Array.isArray(obj)) return [...obj];
    if (obj && typeof obj === "object") return { ...obj };
    return obj;
  };

  const handleAddIndividualRow = (sectionKey, sectionConfig) => {
    const individuals = [...getIndividuals()];
    const roleValue = getRoleValue(sectionConfig, sectionKey);
    const currentCount = individuals.filter(
      (x) => x?.role === roleValue,
    ).length;
    const max = sectionConfig?.max ?? Infinity;

    if (currentCount >= max) return;

    const newRow = buildEmptyRow(sectionConfig.fields);
    onFieldChange("formData.individuals", [...individuals, newRow]);
  };

  const handleRemoveIndividualRow = (sectionKey, sectionConfig, rowIndex) => {
    const individuals = [...getIndividuals()];
    const roleValue = getRoleValue(sectionConfig, sectionKey);

    const matchingRows = individuals
      .map((person, originalIndex) => ({ person, originalIndex }))
      .filter(({ person }) => person?.role === roleValue);

    const min = sectionConfig?.min ?? 0;
    if (matchingRows.length <= min) return;

    const target = matchingRows[rowIndex];
    if (!target) return;

    const updatedIndividuals = individuals.filter(
      (_, idx) => idx !== target.originalIndex,
    );

    onFieldChange("formData.individuals", updatedIndividuals);
  };

  const handleDocumentChange = (fieldPath, file) => {
    handleFieldChange(fieldPath, { file, progress: 0 });
  };

  const getVisibleConditionalFields = (fieldCfg, value) => {
    if (!fieldCfg.conditionalFields) return {};
    return fieldCfg.conditionalFields[value] || {};
  };

  const getDisplayedIndividualFile = (
    sectionKey,
    sectionConfig,
    rowIndex,
    fieldName,
    rowData,
  ) => {
    const localValue = rowData?.[fieldName];

    // Prefer local unsaved file first
    if (hasUsableLocalFile(localValue)) {
      return localValue;
    }

    // Otherwise fallback to uploaded backend doc
    const documentType = buildIndividualDocumentType(
      sectionKey,
      sectionConfig,
      rowIndex,
      fieldName,
    );

    const existingDoc = existingDocumentMap[documentType];
    if (!existingDoc) return null;

    return {
      uploaded: true,
      document_id: existingDoc.document_id,
      document_type: existingDoc.document_type,
      original_filename: existingDoc.original_filename,
      storage_path: existingDoc.storage_path,
      mime_type: existingDoc.mime_type,
      status: existingDoc.status,
      created_at: existingDoc.created_at,
    };
  };

  const getDisplayedTopLevelFile = (fieldName, localValue) => {
    if (hasUsableLocalFile(localValue)) {
      return localValue;
    }

    const existingDoc = existingDocumentMap[fieldName];
    if (!existingDoc) return null;

    return {
      uploaded: true,
      document_id: existingDoc.document_id,
      document_type: existingDoc.document_type,
      original_filename: existingDoc.original_filename,
      storage_path: existingDoc.storage_path,
      mime_type: existingDoc.mime_type,
      status: existingDoc.status,
      created_at: existingDoc.created_at,
    };
  };

  const renderField = (fullKey, fieldCfg) => {
    const fieldName = fullKey.split(".").slice(-1)[0];

    const value =
      getNestedValue(getFormDataRoot(), fullKey) ??
      getNestedValue(data, fullKey);

    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={fullKey} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fullKey
              .split(".")
              .slice(-1)[0]
              .replace(/([A-Z])/g, " $1")
              .trim()}
          </p>
          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderField(`${fullKey}.${subKey}`, subCfg),
          )}
        </div>
      );
    }

    if (fieldCfg.type === "file") {
      const displayedFile = getDisplayedTopLevelFile(fieldName, value);
      const isBusinessProfileOCRField =
        fieldName === businessProfileFieldKey &&
        fieldCfg?.ocrTarget === "business_profile";

      return (
        <div key={fullKey} className="mb-6">
          <FileUploadField
            fieldName={fullKey}
            label={fieldCfg.label}
            file={displayedFile}
            onChange={(file) => handleDocumentChange(fullKey, file)}
            required={fieldCfg.required || false}
            acceptTypes="application/pdf,image/jpeg,image/png"
            placeholder={fieldCfg.placeholder || ""}
            maxSize={5242880}
            disabled={disabled}
          />

          {/* {isBusinessProfileOCRField && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAutofillBusinessProfile(fieldName)}
                disabled={businessProfileUploading || disabled}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  businessProfileUploading
                    ? "bg-gray-400"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {businessProfileUploading ? "Autofilling..." : "Autofill"}
              </button>

              {businessProfileError && (
                <p className="text-sm text-red-600">{businessProfileError}</p>
              )}

              {businessProfileSuccessMsg && (
                <p className="text-sm text-green-600">
                  {businessProfileSuccessMsg}
                </p>
              )}
            </div>
          )} */}
        </div>
      );
    }

    const fieldElement = (
      <FormFieldGroup
        key={fullKey}
        fieldName={fullKey}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value ?? ""}
        onChange={onFieldChange}
        // onChange={(_, nextValue) => handleFieldChange(fullKey, nextValue)}
        type={fieldCfg.type || "text"}
        options={fieldCfg.options || []}
        required={fieldCfg.required || false}
        disabled={disabled || fieldCfg.readonly}
      />
    );

    if (fieldCfg.conditionalFields && value != null) {
      const visibleFields = getVisibleConditionalFields(fieldCfg, value);
      return (
        <div key={fullKey}>
          {fieldElement}
          <div className="ml-4 mt-2">
            {Object.entries(visibleFields).map(([condKey, condCfg]) =>
              renderField(
                `${fullKey.split(".").slice(0, -1).join(".")}.${condKey}`,
                condCfg,
              ),
            )}
          </div>
        </div>
      );
    }

    return fieldElement;
  };

  const renderIndividualRowField = (
    sectionKey,
    sectionConfig,
    rowIndex,
    rowData,
    fieldName,
    fieldCfg,
    parentPath = "",
  ) => {
    const fullPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;
    const value = getNestedValue(rowData, fullPath);

    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={`${sectionKey}.${rowIndex}.${fullPath}`} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldName.replace(/([A-Z])/g, " $1").trim()}
          </p>

          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderIndividualRowField(
              sectionKey,
              sectionConfig,
              rowIndex,
              rowData,
              subKey,
              subCfg,
              fullPath,
            ),
          )}
        </div>
      );
    }

    if (fieldCfg.type === "file") {
      return (
        <FileUploadField
          key={`${sectionKey}.${rowIndex}.${fullPath}`}
          fieldName={`${sectionKey}.${rowIndex}.${fullPath}`}
          label={fieldCfg.label}
          // file={value || null}
          file={getDisplayedIndividualFile(
            sectionKey,
            sectionConfig,
            rowIndex,
            fieldName,
            rowData,
          )}
          onChange={(file) =>
            handleIndividualFieldChange(
              sectionKey,
              sectionConfig,
              rowIndex,
              fullPath,
              file ? { file, progress: 0 } : null,
            )
          }
          required={fieldCfg.required || false}
          acceptTypes="application/pdf,image/jpeg,image/png"
          placeholder={fieldCfg.placeholder || ""}
          maxSize={5242880}
          disabled={disabled || fieldCfg.readonly}
        />
      );
    }

    const fieldElement = (
      <FormFieldGroup
        key={`${sectionKey}.${rowIndex}.${fullPath}`}
        fieldName={`${sectionKey}.${rowIndex}.${fullPath}`}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value ?? ""}
        onChange={(_, nextValue) =>
          handleIndividualFieldChange(
            sectionKey,
            sectionConfig,
            rowIndex,
            fullPath,
            nextValue,
          )
        }
        type={fieldCfg.type || "text"}
        options={fieldCfg.options || []}
        required={fieldCfg.required || false}
        disabled={disabled || fieldCfg.readonly}
      />
    );

    if (fieldCfg.conditionalFields && value != null) {
      const visibleFields = fieldCfg.conditionalFields[value] || {};
      return (
        <div key={`${sectionKey}.${rowIndex}.${fullPath}`}>
          {fieldElement}
          <div className="ml-4 mt-2">
            {Object.entries(visibleFields).map(([condKey, condCfg]) =>
              renderIndividualRowField(
                sectionKey,
                sectionConfig,
                rowIndex,
                rowData,
                condKey,
                condCfg,
                parentPath,
              ),
            )}
          </div>
        </div>
      );
    }

    return fieldElement;
  };

  useEffect(() => {
    Object.entries(repeatableSectionsConfig).forEach(
      ([sectionKey, section]) => {
        const minRows = section.min ?? 0;

        if (isIndividualsStorage(section)) {
          const individuals = getIndividuals();
          const roleValue = getRoleValue(section, sectionKey);

          const sectionRows = individuals.filter((p) => p?.role === roleValue);

          if (sectionRows.length < minRows) {
            const missingCount = minRows - sectionRows.length;
            const additionalRows = Array.from({ length: missingCount }, () =>
              buildEmptyRow(section.fields, sectionKey),
            );

            onFieldChange("formData.individuals", [
              ...individuals,
              ...additionalRows,
            ]);
          }
        } else {
          const currentRows = getSectionRows(sectionKey, section);

          if (currentRows.length < minRows) {
            const missingCount = minRows - currentRows.length;
            const additionalRows = Array.from({ length: missingCount }, () =>
              buildEmptyRow(section.fields),
            );

            onFieldChange(`formData.${sectionKey}`, [
              ...currentRows,
              ...additionalRows,
            ]);
          }
        }
      },
    );
  }, [repeatableSectionsConfig]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      {/* LIVENESS DETECTION */}
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
                        Face match score must be at least {MIN_FACE_MATCH_SCORE}
                        % before you can proceed to the next step.
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
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="gap-2"
                >
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

      <Separator className="my-8 border-1 bg-gray-100" />

      {/* AUTOFILL FUNCTION */}
      {extractorConfig && businessProfileFieldKey && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {businessProfileFieldConfig?.label || extractorConfig.title}
              </p>
              <p className="text-xs text-gray-500">
                {extractorConfig.helperText}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleChooseBusinessProfile}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                disabled={businessProfileUploading || disabled}
              >
                Upload PDF
              </button>

              <button
                type="button"
                onClick={handleAutofillBusinessProfile}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  businessProfileUploading
                    ? "bg-gray-400"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={businessProfileUploading || disabled}
              >
                {businessProfileUploading ? "Autofilling..." : "Autofill"}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleBusinessProfileFileChange}
              />
            </div>
          </div>

          <div className="mt-3 text-xs">
            {businessProfileFile?.name && (
              <p className="text-gray-600">
                Selected:{" "}
                <span className="font-medium">{businessProfileFile.name}</span>
              </p>
            )}
            {businessProfileError && (
              <p className="mt-1 text-red-600">{businessProfileError}</p>
            )}
            {businessProfileSuccessMsg && (
              <p className="mt-1 text-green-600">{businessProfileSuccessMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* Top-Level Fields */}
      {Object.entries(basicFieldsConfig).map(([fieldName, fieldConfig]) =>
        renderField(fieldName, fieldConfig),
      )}

      {Object.entries(repeatableSectionsConfig).map(([sectionKey, section]) => {
        const rows = getSectionRows(sectionKey, section);
        const minRows = section.min ?? 0;
        const maxRows = section.max ?? Infinity;
        const useIndividuals = isIndividualsStorage(section);

        const effectiveRows =
          rows.length > 0
            ? rows
            : Array.from({ length: minRows }, () =>
                buildEmptyRow(
                  section.fields,
                  useIndividuals ? sectionKey : null,
                ),
              );

        return (
          <div key={sectionKey} className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {section.label}
              </h3>

              {!disabled && rows.length < maxRows && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    useIndividuals
                      ? handleAddIndividualRow(sectionKey, section)
                      : handleAddRepeatableRow(sectionKey, section)
                  }
                >
                  Add {section.label}
                </Button>
              )}
            </div>

            {effectiveRows.map((row, index) => (
              <div
                key={`${sectionKey}-${index}`}
                className="mb-6 rounded-xl border border-gray-200 p-4 bg-white"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium text-gray-800">
                    {section.label} {index + 1}
                  </p>

                  {!disabled && rows.length > minRows && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        useIndividuals
                          ? handleRemoveIndividualRow(
                              sectionKey,
                              section,
                              index,
                            )
                          : handleRemoveRepeatableRow(
                              sectionKey,
                              index,
                              section,
                            )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {Object.entries(section.fields).map(
                  ([fieldName, fieldConfig]) =>
                    useIndividuals
                      ? renderIndividualRowField(
                          sectionKey,
                          section,
                          index,
                          row,
                          fieldName,
                          fieldConfig,
                        )
                      : renderField(
                          `formData.${sectionKey}.${index}.${fieldName}`,
                          fieldConfig,
                        ),
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default Step1BasicInformation;

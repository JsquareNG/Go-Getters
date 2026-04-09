import React, { useEffect, useMemo, useState, useCallback } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

import { allDocuments } from "@/api/documentApi";
import { classifyAndExtractApi } from "@/api/ocrApi";

/**
 * Step3ComplianceDocumentation
 * Document fields with pre-upload classification/verification.
 */
const Step3ComplianceDocumentation = ({
  data,
  onFieldChange,
  disabled = false,
  applicationId,
}) => {
  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

  const [existingDocuments, setExistingDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [verificationState, setVerificationState] = useState({});

  const step4Fields = useMemo(() => {
    const entity = activeConfig.entities?.[data?.businessType] || {};
    const step4 = entity.steps?.find((s) => s.id === "step4") || {};
    return step4.fields || {};
  }, [activeConfig, data?.businessType]);

  useEffect(() => {
    if (!applicationId) return;

    const fetchDocuments = async () => {
      try {
        setLoadingDocuments(true);
        const docs = await allDocuments(applicationId);
        setExistingDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to fetch existing documents:", err);
        setExistingDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [applicationId]);

  const existingDocumentMap = useMemo(() => {
    return existingDocuments.reduce((acc, doc) => {
      acc[doc.document_type] = doc;
      return acc;
    }, {});
  }, [existingDocuments]);

  const getNestedValue = (obj, path) => {
    if (!obj || !path) return undefined;

    return path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      const isIndex = !Number.isNaN(Number(key));
      return isIndex ? acc[Number(key)] : acc[key];
    }, obj);
  };

  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") return;
    onFieldChange(name, value);
  };

  const normalizeDocumentType = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const inferExpectedDocumentType = (fieldPath) => {
    const key = String(fieldPath || "").toLowerCase();

    if (key.includes("businessprofile")) return "business_profile";
    if (key.includes("businessregistrationupload"))
      return "business_registration";
    if (key.includes("incorporationupload"))
      return "certificate_of_incorporation";
    if (key.includes("boardresolution")) return "board_resolution";
    if (key.includes("partnershipagreement")) return "partnership_agreement";
    if (key.includes("lpagreement")) return "lp_agreement";
    if (key.includes("llpresolution")) return "llp_resolution";
    if (key.includes("npwp")) return "npwp_certificate";
    if (key.includes("deedofestablishment")) return "deed_of_establishment";
    if (key.includes("articlesofassociation")) return "articles_of_association";
    if (key.includes("bankstatement")) return "bank_statement";
    if (key.includes("proofofaddress")) return "proof_of_address";

    return key;
  };

  const hasUsableLocalFile = (value) =>
    !!value && (value instanceof File || value?.file instanceof File);

  const getDisplayedFileValue = (fieldPath) => {
    const localValue =
      getNestedValue(data?.formData || {}, fieldPath) ??
      getNestedValue(data, fieldPath) ??
      null;

    if (hasUsableLocalFile(localValue)) return localValue;

    const existingDoc = existingDocumentMap[fieldPath];
    if (!existingDoc) return null;

    return {
      uploaded: true,
      verified: true,
      verificationStatus: "verified",
      verificationMessage: "Previously uploaded document found.",
      document_id: existingDoc.document_id,
      document_type: existingDoc.document_type,
      original_filename: existingDoc.original_filename,
      storage_path: existingDoc.storage_path,
      mime_type: existingDoc.mime_type,
      status: existingDoc.status,
      created_at: existingDoc.created_at,
    };
  };

  const getFieldVerificationMeta = (fieldPath) => {
    const localValue =
      getNestedValue(data?.formData || {}, fieldPath) ??
      getNestedValue(data, fieldPath) ??
      null;

    if (verificationState[fieldPath]) return verificationState[fieldPath];

    if (localValue?.verificationStatus) {
      return {
        status: localValue.verificationStatus,
        message: localValue.verificationMessage || "",
        detectedType: localValue.detectedType || null,
        expectedType: localValue.expectedType || null,
      };
    }

    if (existingDocumentMap[fieldPath]) {
      return {
        status: "verified",
        message: "Previously uploaded document found.",
        detectedType: normalizeDocumentType(
          existingDocumentMap[fieldPath]?.document_type,
        ),
        expectedType: normalizeDocumentType(
          existingDocumentMap[fieldPath]?.document_type,
        ),
      };
    }

    return {
      status: "idle",
      message: "",
      detectedType: null,
      expectedType: null,
    };
  };

  const setFieldVerificationState = (fieldPath, nextState) => {
    setVerificationState((prev) => ({
      ...prev,
      [fieldPath]: {
        ...(prev[fieldPath] || {}),
        ...nextState,
      },
    }));
  };

  const buildFileValidator = useCallback(
    (fieldPath) => async (file) => {
      const expectedType = inferExpectedDocumentType(fieldPath);

      setFieldVerificationState(fieldPath, {
        status: "verifying",
        message: "Verifying document...",
        expectedType,
        detectedType: null,
      });

      try {
        const result = await classifyAndExtractApi(file);

        const detectedType = normalizeDocumentType(
          result?.document_type ||
            result?.classified_as ||
            result?.doc_type ||
            result?.label,
        );

        const isSupported = result?.is_supported === true;
        if (!isSupported) {
          const errorMessage = detectedType
            ? `Detected document type "${detectedType}" is not supported.`
            : "This document is not supported.";

          setFieldVerificationState(fieldPath, {
            status: "failed",
            message: errorMessage,
            expectedType,
            detectedType,
          });

          throw new Error(errorMessage);
        }

        const nextValue = {
          file,
          progress: 0,
          verified: true,
          verificationStatus: "verified",
          verificationMessage: "Document verified successfully.",
          detectedType,
          expectedType,
          classificationResult: result,
        };

        setFieldVerificationState(fieldPath, {
          status: "verified",
          message: "Document verified successfully.",
          expectedType,
          detectedType,
        });

        return nextValue;
      } catch (err) {
        if (
          !verificationState[fieldPath]?.status ||
          verificationState[fieldPath]?.status === "verifying"
        ) {
          setFieldVerificationState(fieldPath, {
            status: "failed",
            message:
              err?.message ||
              "Verification failed. Please upload the file again.",
            expectedType,
            detectedType: null,
          });
        }

        throw err;
      }
    },
    [verificationState],
  );

  const renderField = (fieldKey, fieldCfg, parentPath = "") => {
    const fullPath = parentPath ? `${parentPath}.${fieldKey}` : fieldKey;
    const value =
      getNestedValue(data?.formData || {}, fullPath) ??
      getNestedValue(data, fullPath) ??
      null;

    if (typeof fieldCfg === "object" && !fieldCfg.type && !fieldCfg.label) {
      return (
        <div key={fullPath} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldKey.replace(/([A-Z])/g, " $1").trim()}
          </p>

          {Object.entries(fieldCfg).map(([subKey, subCfg]) =>
            renderField(subKey, subCfg, fullPath),
          )}
        </div>
      );
    }

    if (fieldCfg.type === "file") {
      return (
        <FileUploadField
          key={fullPath}
          fieldName={fullPath}
          label={fieldCfg.label}
          file={getDisplayedFileValue(fullPath)}
          onChange={(nextValue) => handleFieldChange(fullPath, nextValue)}
          beforeAcceptFile={buildFileValidator(fullPath)}
          verificationMeta={getFieldVerificationMeta(fullPath)}
          required={fieldCfg.required || false}
          acceptTypes="application/pdf,image/jpeg,image/png"
          placeholder={fieldCfg.placeholder || ""}
          maxSize={5242880}
          disabled={disabled}
        />
      );
    }

    if (fieldCfg.type === "select") {
      return (
        <div key={fullPath} className="mb-6">
          <FormFieldGroup
            fieldName={fullPath}
            label={fieldCfg.label}
            placeholder={fieldCfg.placeholder || ""}
            value={value ?? ""}
            onChange={onFieldChange}
            type="select"
            options={fieldCfg.options || []}
            required={fieldCfg.required || false}
            disabled={disabled}
          />

          {fieldCfg.conditionalFields &&
            value &&
            Object.entries(fieldCfg.conditionalFields[value] || {}).map(
              ([condKey, condCfg]) => renderField(condKey, condCfg, parentPath),
            )}
        </div>
      );
    }

    return (
      <FormFieldGroup
        key={fullPath}
        fieldName={fullPath}
        label={fieldCfg.label}
        placeholder={fieldCfg.placeholder || ""}
        value={value ?? ""}
        onChange={onFieldChange}
        required={fieldCfg.required || false}
        type={fieldCfg.type || "text"}
        options={fieldCfg.options || []}
        disabled={disabled}
      />
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Documentation</h2>

      {loadingDocuments && (
        <p className="mb-4 text-sm text-gray-500">
          Loading uploaded documents...
        </p>
      )}

      {Object.entries(step4Fields).map(([key, cfg]) => renderField(key, cfg))}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          ✓ All documents and declarations will be reviewed by our compliance
          team within 2-3 business days.
        </p>
        <p className="text-sm text-blue-800 mt-2">
          ✓ We may request additional documents or clarifications if needed.
        </p>
      </div>
    </div>
  );
};

export default Step3ComplianceDocumentation;

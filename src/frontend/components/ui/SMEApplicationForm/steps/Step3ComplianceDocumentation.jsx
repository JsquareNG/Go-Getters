import React, { useEffect, useMemo, useState, useCallback } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import FileUploadField from "../components/FileUploadField";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";
import { allDocuments } from "@/api/documentApi";
import { classifyAndExtractApi } from "@/api/ocrApi";

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

  // ui-only verification state for current session
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
        console.log(docs);
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

  // const getDisplayedFileValue = (fieldPath) => {
  //   const localValue =
  //     getNestedValue(data?.formData || {}, fieldPath) ??
  //     getNestedValue(data, fieldPath) ??
  //     null;
  //   console.log("local", localValue);

  //   // Prefer local unsaved file/value first
  //   // if (localValue) return localValue;
  //   const hasLocalFile =
  //     localValue &&
  //     (localValue instanceof File || localValue?.file instanceof File);

  //   if (hasLocalFile) return localValue;

  //   // Fallback to backend existing uploaded document
  //   const existingDoc = existingDocumentMap[fieldPath];
  //   console.log("e", existingDoc);

  //   if (!existingDoc) return null;

  //   return {
  //     uploaded: true,
  //     document_id: existingDoc.document_id,
  //     document_type: existingDoc.document_type,
  //     original_filename: existingDoc.original_filename,
  //     storage_path: existingDoc.storage_path,
  //     mime_type: existingDoc.mime_type,
  //     status: existingDoc.status,
  //     created_at: existingDoc.created_at,
  //   };
  // };

  const handleFieldChange = (name, value) => {
    if (!name || typeof name !== "string") {
      console.error("Invalid field name:", name);
      return;
    }

    onFieldChange(name, value);
  };

  // const handleDocumentChange = (fieldPath, file) => {
  //   if (!fieldPath) {
  //     console.error("Invalid document field:", fieldPath);
  //     return;
  //   }

  //   handleFieldChange(fieldPath, file ? { file, progress: 0 } : null);
  // };

  // infer expected type from field name, no config change needed
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

    // fallback = fieldPath itself
    return key;
  };

  const normalizeDocumentType = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
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

  const classifyDocument = async (file) => {
    return await classifyAndExtractApi(file);
  };

  const validateClassificationResult = (fieldPath, result) => {
    const expectedType = normalizeDocumentType(
      inferExpectedDocumentType(fieldPath),
    );

    const detectedType = normalizeDocumentType(
      result?.document_type ||
        result?.classified_as ||
        result?.doc_type ||
        result?.label,
    );

    const isValidDocument =
      result?.is_valid_document ?? result?.valid ?? result?.is_valid ?? true;

    if (!isValidDocument) {
      return {
        ok: false,
        error:
          "This file does not appear to be a valid document. Please upload again.",
        expectedType,
        detectedType,
      };
    }

    // only compare if backend returned a type
    if (detectedType && expectedType && detectedType !== expectedType) {
      return {
        ok: false,
        error: `Wrong document uploaded. Expected ${expectedType}, but detected ${detectedType}. Please upload the correct file.`,
        expectedType,
        detectedType,
      };
    }

    return {
      ok: true,
      expectedType,
      detectedType,
    };
  };

  const handleDocumentChange = useCallback(async (fieldPath, file) => {
    if (!fieldPath) {
      console.error("Invalid document field:", fieldPath);
      return;
    }

    // clear field
    if (!file) {
      setFieldVerificationState(fieldPath, {
        status: "idle",
        message: "",
        detectedType: null,
        expectedType: inferExpectedDocumentType(fieldPath),
      });
      handleFieldChange(fieldPath, null);
      return;
    }

    setFieldVerificationState(fieldPath, {
      status: "verifying",
      message: "Verifying document...",
      detectedType: null,
      expectedType: inferExpectedDocumentType(fieldPath),
    });

    try {
      const result = await classifyDocument(file);
      console.log("CLASSIFY RESULT:", fieldPath, result);

      const validation = validateClassificationResult(fieldPath, result);

      if (!validation.ok) {
        setFieldVerificationState(fieldPath, {
          status: "failed",
          message: validation.error,
          detectedType: validation.detectedType,
          expectedType: validation.expectedType,
        });

        // IMPORTANT: invalid file should NOT be stored in form state
        handleFieldChange(fieldPath, null);
        return;
      }

      const nextValue = {
        file,
        progress: 0,
        verified: true,
        verificationStatus: "verified",
        verificationMessage: "Document verified successfully.",
        detectedType: validation.detectedType,
        expectedType: validation.expectedType,
        classificationResult: result,
      };

      handleFieldChange(fieldPath, nextValue);

      setFieldVerificationState(fieldPath, {
        status: "verified",
        message: "Document verified successfully.",
        detectedType: validation.detectedType,
        expectedType: validation.expectedType,
      });
    } catch (err) {
      console.error("Document verification failed:", err);

      setFieldVerificationState(fieldPath, {
        status: "failed",
        message:
          err?.message || "Verification failed. Please upload the file again.",
        detectedType: null,
        expectedType: inferExpectedDocumentType(fieldPath),
      });

      // IMPORTANT: failed file should NOT be stored in form state
      handleFieldChange(fieldPath, null);
    }
  }, []);

  const hasUsableLocalFile = (value) => {
  return !!value && (value instanceof File || value?.file instanceof File);
};

  const getDisplayedFileValue = (fieldPath) => {
    const localValue =
      getNestedValue(data?.formData || {}, fieldPath) ??
      getNestedValue(data, fieldPath) ??
      null;

    // prefer local verified file
    // if (hasLocalFile(localValue)) return localValue;
    if (hasUsableLocalFile(localValue)) return localValue;

    // fallback to backend uploaded doc
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

    const localState = verificationState[fieldPath];
    if (localState) return localState;

    if (localValue?.verificationStatus) {
      return {
        status: localValue.verificationStatus,
        message: localValue.verificationMessage || "",
        detectedType: localValue.detectedType || null,
        expectedType:
          localValue.expectedType || inferExpectedDocumentType(fieldPath),
      };
    }

    if (existingDocumentMap[fieldPath]) {
      return {
        status: "verified",
        message: "Previously uploaded document found.",
        detectedType: normalizeDocumentType(
          existingDocumentMap[fieldPath]?.document_type,
        ),
        expectedType: inferExpectedDocumentType(fieldPath),
      };
    }

    return {
      status: "idle",
      message: "",
      detectedType: null,
      expectedType: inferExpectedDocumentType(fieldPath),
    };
  };

  const VerificationBadge = ({ meta }) => {
    if (!meta || meta.status === "idle") return null;

    if (meta.status === "verifying") {
      return (
        <div className="mt-2 flex items-center gap-2 text-sm text-amber-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{meta.message || "Verifying..."}</span>
        </div>
      );
    }

    if (meta.status === "verified") {
      return (
        <div className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>{meta.message || "Document verified successfully."}</span>
          </div>

          {meta.detectedType && (
            <p className="mt-1 text-xs text-green-700">
              Detected type:{" "}
              <span className="font-medium">{meta.detectedType}</span>
            </p>
          )}
        </div>
      );
    }

    if (meta.status === "failed") {
      return (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{meta.message || "Document verification failed."}</span>
          </div>

          {meta.expectedType && (
            <p className="mt-1 text-xs text-red-700">
              Expected type:{" "}
              <span className="font-medium">{meta.expectedType}</span>
            </p>
          )}

          {meta.detectedType && (
            <p className="mt-1 text-xs text-red-700">
              Detected type:{" "}
              <span className="font-medium">{meta.detectedType}</span>
            </p>
          )}
        </div>
      );
    }

    return null;
  };

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

    // if (fieldCfg.type === "file") {
    //   return (
    //     <FileUploadField
    //       key={fullPath}
    //       fieldName={fullPath}
    //       label={fieldCfg.label}
    //       file={getDisplayedFileValue(fullPath)}
    //       onChange={(file) => handleDocumentChange(fullPath, file)}
    //       required={fieldCfg.required || false}
    //       acceptTypes="application/pdf,image/jpeg,image/png"
    //       placeholder={fieldCfg.placeholder || ""}
    //       maxSize={5242880}
    //       disabled={disabled}
    //     />
    //   );
    // }
    if (fieldCfg.type === "file") {
      const verificationMeta = getFieldVerificationMeta(fullPath);

      return (
        <div key={fullPath} className="mb-6">
          <FileUploadField
            fieldName={fullPath}
            label={fieldCfg.label}
            file={getDisplayedFileValue(fullPath)}
            onChange={(file) => handleDocumentChange(fullPath, file)}
            required={fieldCfg.required || false}
            acceptTypes="application/pdf,image/jpeg,image/png"
            placeholder={fieldCfg.placeholder || ""}
            maxSize={5242880}
            disabled={disabled || verificationMeta.status === "verifying"}
          />

          <VerificationBadge meta={verificationMeta} />
        </div>
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

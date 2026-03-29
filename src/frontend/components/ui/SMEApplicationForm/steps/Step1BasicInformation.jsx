import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

import FieldRenderer from "../components/FieldRenderer";
import ConditionalFieldsRenderer from "../components/ConditionalFieldsRenderer";
import RepeatableSectionRenderer from "../components/RepeatableSectionRenderer";

import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

import { allDocuments } from "@/api/documentApi";
import { extractProfileApi, classifyAndExtractApi } from "@/api/ocrApi";

const Step1BasicInformation = ({
  data,
  onFieldChange,
  disabled = false,
  applicationId,
}) => {
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [ocrState, setOcrState] = useState({});
  const [verificationState, setVerificationState] = useState({});

  const processedOcrFilesRef = useRef({});

  useEffect(() => {
    if (!applicationId || applicationId === "new") return;

    const fetchDocs = async () => {
      try {
        const docs = await allDocuments(applicationId);
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

  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

  const { basicFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = activeConfig?.entities[data?.businessType] || {};
    const step2 = entity.steps?.find((s) => s.id === "step2") || {};

    return {
      basicFieldsConfig: step2.fields || {},
      repeatableSectionsConfig: step2.repeatableSections || {},
    };
  }, [activeConfig, data?.businessType]);

  const getFormDataRoot = () => {
    if (data?.formData && Object.keys(data.formData).length > 0) {
      return data.formData;
    }
    return data || {};
  };

  const getNestedValue = (obj, path) => {
    if (!path) return undefined;

    return path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      const isIndex = !Number.isNaN(Number(key));
      return isIndex ? acc[Number(key)] : acc[key];
    }, obj);
  };

  const normalizeDocumentType = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const inferExpectedDocumentType = (fieldKey, fieldConfig) => {
    if (fieldConfig?.ocrTarget === "business_profile") {
      return "business_profile";
    }

    const key = String(fieldKey || "").toLowerCase();

    if (key.includes("businessprofile")) return "business_profile";
    if (key.includes("npwp")) return "npwp_certificate";
    if (key.includes("proofofaddress")) return "proof_of_address";

    return key;
  };

  const setFieldVerificationState = (fieldKey, nextState) => {
    setVerificationState((prev) => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        ...nextState,
      },
    }));
  };

  const buildFileValidator = useCallback(
    (fieldKey, fieldConfig) => async (file) => {
      const expectedType = inferExpectedDocumentType(fieldKey, fieldConfig);

      setFieldVerificationState(fieldKey, {
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
          const errorMessage =
            detectedType
              ? `Detected document type "${detectedType}" is not supported.`
              : "This document is not supported.";

          setFieldVerificationState(fieldKey, {
            status: "failed",
            message: errorMessage,
            expectedType,
            detectedType,
          });

          throw new Error(errorMessage);
        }

        if (expectedType && detectedType && expectedType !== detectedType) {
          const errorMessage = `Wrong document uploaded. Expected "${expectedType}" but detected "${detectedType}".`;

          setFieldVerificationState(fieldKey, {
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

        setFieldVerificationState(fieldKey, {
          status: "verified",
          message: "Document verified successfully.",
          expectedType,
          detectedType,
        });

        return nextValue;
      } catch (err) {
        throw err;
      }
    },
    [],
  );

  const getSelectedVerifiedFileForField = (fieldKey) => {
    const formDataRoot = getFormDataRoot();
    const fileValue =
      getNestedValue(formDataRoot, fieldKey) ??
      getNestedValue(data, fieldKey);

    const selectedFile = fileValue?.file || fileValue;
    const isVerified =
      fileValue?.verificationStatus === "verified" || fileValue?.verified === true;

    if (!(selectedFile instanceof File)) return null;
    if (!isVerified) return null;

    return selectedFile;
  };

  const getFileSignature = (file) => {
    if (!(file instanceof File)) return null;
    return `${file.name}__${file.size}__${file.lastModified}`;
  };

  const handleFieldChange = (name, value) => {
    if (!name) return;

    delete processedOcrFilesRef.current[name];

    if (!value) {
      setOcrState((prev) => ({
        ...prev,
        [name]: {
          loading: false,
          status: "",
          message: "",
        },
      }));

      setVerificationState((prev) => ({
        ...prev,
        [name]: {
          status: "idle",
          message: "",
          expectedType: null,
          detectedType: null,
        },
      }));
    }

    onFieldChange(name, value);
  };

  const handleOcrAutofill = async (fieldKey, fieldConfig) => {
    const formDataRoot = getFormDataRoot();
    const fileValue =
      getNestedValue(formDataRoot, fieldKey) ??
      getNestedValue(data, fieldKey);

    const selectedFile = fileValue?.file || fileValue;
    const isVerified =
      fileValue?.verificationStatus === "verified" || fileValue?.verified === true;

    if (!(selectedFile instanceof File) || !isVerified) {
      return;
    }

    setOcrState((prev) => ({
      ...prev,
      [fieldKey]: {
        loading: true,
        status: "processing",
        message: "",
      },
    }));

    try {
      const result = await extractProfileApi(selectedFile);
      const payload = result?.data || {};

      if (fieldConfig.ocrTarget === "business_profile") {
        const map = {
          business_name: "businessName",
          business_registration_number: "registrationNumber",
          registered_address: "registeredAddress",
          date_of_registration: "registrationDate",
          npwp: "npwp",
          phone: "phone",
          email: "email",
          business_status: "businessStatus",
        };

        Object.entries(map).forEach(([ocrKey, formKey]) => {
          if (
            payload[ocrKey] !== undefined &&
            payload[ocrKey] !== null &&
            payload[ocrKey] !== ""
          ) {
            onFieldChange(formKey, payload[ocrKey]);
          }
        });
      }

      setOcrState((prev) => ({
        ...prev,
        [fieldKey]: {
          loading: false,
          status: "completed",
          message: "Autofill completed. Please review.",
        },
      }));
    } catch (err) {
      console.error(`OCR failed for ${fieldKey}`, err);

      setOcrState((prev) => ({
        ...prev,
        [fieldKey]: {
          loading: false,
          status: "failed",
          message: err?.message || "Failed to autofill.",
        },
      }));

      delete processedOcrFilesRef.current[fieldKey];
    }
  };

  useEffect(() => {
    Object.entries(basicFieldsConfig).forEach(([fieldKey, fieldConfig]) => {
      if (fieldConfig?.type !== "file" || fieldConfig?.ocr !== true) return;

      const selectedFile = getSelectedVerifiedFileForField(fieldKey);
      if (!(selectedFile instanceof File)) return;

      const signature = getFileSignature(selectedFile);
      const alreadyProcessed =
        processedOcrFilesRef.current[fieldKey] === signature;
      const isCurrentlyLoading = ocrState?.[fieldKey]?.loading;

      if (!alreadyProcessed && !isCurrentlyLoading) {
        processedOcrFilesRef.current[fieldKey] = signature;
        handleOcrAutofill(fieldKey, fieldConfig);
      }
    });
  }, [basicFieldsConfig, data, ocrState]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Basic Information
      </h2>

      {Object.entries(basicFieldsConfig).map(([fieldKey, fieldConfig]) => {
        const value =
          getNestedValue(getFormDataRoot(), fieldKey) ??
          getNestedValue(data, fieldKey);

        if (fieldConfig?.conditionalFields) {
          return (
            <ConditionalFieldsRenderer
              key={fieldKey}
              fieldKey={fieldKey}
              fieldConfig={fieldConfig}
              value={value}
              rowData={getFormDataRoot()}
              onChange={(name, val) => handleFieldChange(name, val)}
              disabled={disabled}
              context={{
                data,
                ocrState,
                verificationState,
                existingDocumentMap,
                beforeAcceptFile: buildFileValidator,
              }}
            />
          );
        }

        return (
          <FieldRenderer
            key={fieldKey}
            fieldKey={fieldKey}
            fieldConfig={fieldConfig}
            value={value}
            onChange={(name, val) => handleFieldChange(name, val)}
            disabled={disabled}
            context={{
              data,
              ocrState,
              verificationState,
              existingDocumentMap,
              beforeAcceptFile: buildFileValidator,
            }}
          />
        );
      })}

      {Object.entries(repeatableSectionsConfig).map(
        ([sectionKey, sectionConfig]) => (
          <RepeatableSectionRenderer
            key={sectionKey}
            sectionKey={sectionKey}
            sectionConfig={sectionConfig}
            formData={getFormDataRoot()}
            onFormDataChange={(next) => onFieldChange("formData", next)}
            disabled={disabled}
            context={{
              data,
              ocrState,
              verificationState,
              existingDocumentMap,
              beforeAcceptFile: buildFileValidator,
            }}
          />
        ),
      )}
    </div>
  );
};

export default Step1BasicInformation;
import React, { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

import { allDocuments } from "@/api/documentApi";

import { selectFormData } from "@/store/applicationFormSlice";

const Step4 = ({ onEdit, disabled = false, applicationId }) => {
  const data = useSelector(selectFormData);
  const [existingDocuments, setExistingDocuments] = useState([]);

  useEffect(() => {
    if (!applicationId || applicationId === "new") return;

    const fetchDocuments = async () => {
      try {
        const docs = await allDocuments(applicationId);
        setExistingDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
        setExistingDocuments([]);
      }
    };

    fetchDocuments();
  }, [applicationId]);

  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

  const entityConfig = useMemo(
    () => activeConfig.entities[data?.businessType] || {},
    [data?.businessType, data?.country],
  );
  const getStepConfigById = (id) => {
    return (
      entityConfig.steps?.find((s) => s.id === id) || {
        fields: {},
        repeatableSections: {},
        documents: [],
      }
    );
  };

  const step2Config = getStepConfigById("step2"); // match your config
  const step3Config = getStepConfigById("step3"); // match your config
  const step4Config = getStepConfigById("step4"); // match your config

  const normalizeDocType = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const getConfigDocumentType = ({
    cfg,
    fieldKey,
    sectionKey = null,
    sectionConfig = null,
    rowIndex = null,
  }) => {
    if (cfg?.documentType) return cfg.documentType;

    if (!sectionKey) {
      return fieldKey;
    }

    if (sectionConfig?.storage === "individuals") {
      const roleValue = getSectionRoleValue(sectionKey, sectionConfig);
      return `${roleValue}_${rowIndex + 1}_${fieldKey}`;
    }

    return `${sectionKey}_${rowIndex + 1}_${fieldKey}`;
  };

  const existingDocumentMap = useMemo(() => {
    return existingDocuments.reduce((acc, doc) => {
      const type = normalizeDocType(doc.document_type);
      if (type) {
        acc[type] = doc;
      }
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

  const unwrapLocalFile = (value) => {
    if (!value) return null;
    if (value instanceof File) return value;
    if (value?.file instanceof File) return value.file;
    return null;
  };

  const isBackendDocument = (value) => {
    return (
      value &&
      typeof value === "object" &&
      value.document_id &&
      value.original_filename
    );
  };

  const formatDisplayedDocument = (value) => {
    const localFile = unwrapLocalFile(value);

    if (localFile) {
      return `${localFile.name} (${(localFile.size / 1024).toFixed(2)} KB)`;
    }

    if (isBackendDocument(value)) {
      return value.original_filename || value.document_type || "Uploaded";
    }

    if (
      value &&
      typeof value === "object" &&
      (value.verificationStatus ||
        value.verified ||
        value.original_filename ||
        value.detectedType ||
        value.expectedType)
    ) {
      return (
        value.originalFilename ||
        value.detectedType ||
        value.expectedType ||
        "Uploaded"
      );
    }

    return "Not uploaded";
  };

  const getDisplayedDocument = ({
    cfg,
    fieldKey,
    stepData = {},
    item = null,
    sectionKey = null,
    sectionConfig = null,
    rowIndex = null,
  }) => {
    const localValue = item
      ? (item?.[fieldKey] ?? null)
      : (getNestedValue(stepData?.formData || {}, fieldKey) ??
        getNestedValue(stepData, fieldKey) ??
        null);

    const documentType = getConfigDocumentType({
      cfg,
      fieldKey,
      sectionKey,
      sectionConfig,
      rowIndex,
    });

    const localFile = unwrapLocalFile(localValue);

    if (
      localValue &&
      (localFile ||
        localValue?.document_id ||
        localValue?.original_filename ||
        localValue?.verificationStatus ||
        localValue?.uploaded)
    ) {
      return localValue;
    }

    const backendDoc =
      existingDocumentMap[normalizeDocType(documentType)] || null;

    if (backendDoc) return backendDoc;

    return null;

  };

  const getMergedFormState = (rawData = {}) => {
    const nested = rawData?.formData || {};
    return {
      ...rawData,
      ...nested,
      individuals: nested.individuals ?? rawData.individuals ?? [],
    };
  };

  const getSectionRoleValue = (sectionKey, sectionConfig) => {
    return sectionConfig?.fields?.role?.value || sectionKey;
  };

  const getSectionItems = (stepData, sectionKey, sectionConfig) => {
    const merged = getMergedFormState(stepData);
    const storageKey = sectionConfig?.storage || sectionKey;

    if (storageKey === "individuals") {
      const rowTypeField = sectionConfig?.rowTypeField || "role";
      const rowTypeValue = sectionConfig?.rowTypeValue;

      if (!rowTypeValue)
        return Array.isArray(merged.individuals) ? merged.individuals : [];

      return (merged.individuals || []).filter(
        (person) => person?.[rowTypeField] === rowTypeValue,
      );
    }

    return Array.isArray(merged?.[storageKey]) ? merged[storageKey] : [];
  };

  const getFieldsFromStep = (stepConfig, stepData = {}) => {
    const fields = [];

    if (!stepConfig) return fields;

    const processFields = (fieldSet, data, prefix = "") => {
      Object.entries(fieldSet || {}).forEach(([key, cfg]) => {
        let value = data?.[key] ?? "";

        if (cfg.conditionalFields && value in cfg.conditionalFields) {
          fields.push({
            label: prefix + cfg.label,
            value: value || "Not provided",
            missing:
              cfg.required &&
              (value === "" || value === null || value === undefined),
          });

          const subFields = cfg.conditionalFields[value];
          console.log("subfields", subFields);
          Object.entries(subFields).forEach(([subKey, subCfg]) => {
            const subValue = data?.[subKey];

            let formattedSubValue;
            if (subCfg.type === "file") {
              const displayedDoc = getDisplayedDocument({
                cfg: subCfg,
                fieldKey: subKey,
                stepData: data,
              });
              console.log("displayedDoc", displayedDoc);
              formattedSubValue = formatDisplayedDocument(displayedDoc);
            } else {
              formattedSubValue = formatReviewValue(subValue, subCfg);
            }

            fields.push({
              label: prefix + subCfg.label,
              value: formattedSubValue,
              missing:
                cfg.required &&
                ((cfg.type === "file" &&
                  !getDisplayedDocument({
                    cfg,
                    fieldKey: key,
                    stepData: data,
                  })) ||
                  (cfg.type === "kyc" && isKycIncomplete(data?.[key])) ||
                  (cfg.type !== "file" &&
                    cfg.type !== "kyc" &&
                    value === "Not provided")),
            });
          });
        } else {
          if (cfg.type === "file") {
            const displayedDoc = getDisplayedDocument({
              cfg,
              fieldKey: key,
              stepData: data,
            });
            value = formatDisplayedDocument(displayedDoc);
          } else {
            value = formatReviewValue(value, cfg);
          }

          fields.push({
            label: prefix + cfg.label,
            value,
            missing:
              (cfg.required &&
                cfg.type === "file" &&
                !getDisplayedDocument({
                  cfg,
                  fieldKey: key,
                  stepData: data,
                })) ||
              (cfg.type === "kyc" && isKycIncomplete(data?.[key])) ||
              (cfg.type !== "file" &&
                cfg.type !== "kyc" &&
                value === "Not provided"),
          });
        }
      });
    };

    processFields(stepConfig.fields, stepData);

    Object.entries(stepConfig.repeatableSections || {}).forEach(
      ([sectionKey, sectionCfg]) => {
        const items = getSectionItems(stepData, sectionKey, sectionCfg);

        items.forEach((item, idx) => {
          Object.entries(sectionCfg.fields || {}).forEach(([key, cfg]) => {
            let value = item?.[key] ?? "";

            if (cfg.conditionalFields && value in cfg.conditionalFields) {
              fields.push({
                label: `${sectionCfg.label} ${idx + 1} - ${cfg.label}`,
                value,
                missing:
                  cfg.required &&
                  ((cfg.type === "kyc" && isKycIncomplete(item?.[key])) ||
                    value === "Not provided"),
              });

              const subFields = cfg.conditionalFields[value];
              Object.entries(subFields).forEach(([subKey, subCfg]) => {
                const subValue = item?.[subKey];

                let formattedSubValue;
                if (subCfg.type === "file") {
                  const displayedDoc = getDisplayedDocument({
                    cfg: subCfg,
                    fieldKey: subKey,
                    item,
                    sectionKey,
                    sectionConfig: sectionCfg,
                    rowIndex: idx,
                    stepData,
                  });
                  formattedSubValue = formatDisplayedDocument(displayedDoc);
                } else {
                  formattedSubValue = formatReviewValue(subValue, subCfg);
                }

                fields.push({
                  label: `${sectionCfg.label} ${idx + 1} - ${subCfg.label}`,
                  value: formattedSubValue,
                  missing:
                    subCfg.required &&
                    ((subCfg.type === "file" &&
                      !getDisplayedDocument({
                        cfg: subCfg,
                        fieldKey: subKey,
                        item,
                        sectionKey,
                        sectionConfig: sectionCfg,
                        rowIndex: idx,
                        stepData,
                      })) ||
                      (subCfg.type === "kyc" && isKycIncomplete(subValue)) ||
                      (subCfg.type !== "file" &&
                        subCfg.type !== "kyc" &&
                        formattedSubValue === "Not provided")),
                });
              });

              return;
            }

            if (cfg.type === "file") {
              const displayedDoc = getDisplayedDocument({
                cfg,
                fieldKey: key,
                item,
                sectionKey,
                sectionConfig: sectionCfg,
                rowIndex: idx,
                stepData,
              });

              fields.push({
                label: `${sectionCfg.label} ${idx + 1} - ${cfg.label}`,
                value: formatDisplayedDocument(displayedDoc),
                missing: cfg.required && !displayedDoc,
              });

              return;
            }

            value = formatReviewValue(value, cfg);

            fields.push({
              label: `${sectionCfg.label} ${idx + 1} - ${cfg.label}`,
              value,
              missing:
                cfg.required &&
                ((cfg.type === "kyc" && isKycIncomplete(value)) ||
                  (cfg.type !== "kyc" && value === "Not provided")),
            });
          });
        });
      },
    );

    return fields;
  };

  const formatReviewValue = (value, cfg = {}) => {
    if (value === null || value === undefined || value === "") {
      return "Not provided";
    }

    const localFile = unwrapLocalFile(value);
    if (localFile) {
      return `${localFile.name} (${(localFile.size / 1024).toFixed(2)} KB)`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return "Not provided";
      return value.join(", ");
    }

    if (cfg?.type === "kyc" && typeof value === "object") {
      console.log("Formatting KYC value:", value);
      const overallStatus = value?.overallStatus || "Incomplete";
      return `Status: ${overallStatus}`;
    }

    if (
      value &&
      typeof value === "object" &&
      (value.document_id ||
        value.original_filename ||
        value.verificationStatus ||
        value.uploaded)
    ) {
      return formatDisplayedDocument(value);
    }

    if (typeof value === "object") {
      return "Provided";
    }

    return String(value);
  };

  const isKycIncomplete = (value) => {
    if (!value || typeof value !== "object") return true;

    const overall = String(value?.overallStatus || "")
      .trim()
      .toLowerCase();
    const liveness = String(value?.livenessStatus || "")
      .trim()
      .toLowerCase();
    const face = String(value?.faceMatchStatus || "")
      .trim()
      .toLowerCase();

    if (!overall && !liveness && !face) return true;

    if (
      overall === "declined" ||
      liveness === "declined" ||
      face === "declined"
    ) {
      return true;
    }

    if (
      overall === "pending" ||
      overall === "review" ||
      liveness === "pending" ||
      face === "pending"
    ) {
      return true;
    }

    return false;
  };

  const isEmptyValue = (value) => {
    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
    );
  };

  const validateFieldSet = ({
    fields,
    data,
    stepData,
    sectionKey = null,
    sectionConfig = null,
    rowIndex = null,
  }) => {
    for (const [key, cfg] of Object.entries(fields || {})) {
      const value = data?.[key];

      if (cfg.conditionalFields && value in cfg.conditionalFields) {
        const conditionalFields = cfg.conditionalFields[value] || {};
        const conditionalOk = validateFieldSet({
          fields: conditionalFields,
          data,
          stepData,
          sectionKey,
          sectionConfig,
          rowIndex,
        });
        if (!conditionalOk) return false;
      }

      if (!cfg.required) continue;

      if (cfg.type === "file") {
        const displayedDoc = getDisplayedDocument({
          cfg,
          fieldKey: key,
          stepData,
          item: sectionKey ? data : null,
          sectionKey,
          sectionConfig,
          rowIndex,
        });

        if (!displayedDoc) return false;
      } else if (cfg.type === "kyc") {
        if (isKycIncomplete(value)) return false;
      } else {
        if (isEmptyValue(value)) return false;
      }
    }

    return true;
  };

  const isStepComplete = (stepConfig, formData = {}) => {
    if (!stepConfig) return true;

    if (
      !validateFieldSet({
        fields: stepConfig.fields,
        data: formData,
        stepData: formData,
      })
    ) {
      return false;
    }

    for (const [sectionKey, sectionCfg] of Object.entries(
      stepConfig.repeatableSections || {},
    )) {
      const items = getSectionItems(formData, sectionKey, sectionCfg);

      if ((sectionCfg.min ?? 0) > items.length) return false;

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];

        if (
          !validateFieldSet({
            fields: sectionCfg.fields,
            data: item,
            stepData: formData,
            sectionKey,
            sectionConfig: sectionCfg,
            rowIndex: idx,
          })
        ) {
          return false;
        }
      }
    }

    return true;
  };

  const basicFields = useMemo(
    () => getFieldsFromStep(step2Config, data),
    [step2Config, data],
  );

  const financialFields = useMemo(
    () => getFieldsFromStep(step3Config, data),
    [step3Config, data],
  );

  const complianceFields = useMemo(
    () => getFieldsFromStep(step4Config, data),
    [step4Config, data],
  );

  const allFields = [...basicFields, ...financialFields, ...complianceFields];
  const allStepsComplete =
    isStepComplete(step2Config, data) &&
    isStepComplete(step3Config, data) &&
    isStepComplete(step4Config, data);

  const ReviewSection = ({ title, fields, onEditClick }) => (
    <div className="mb-8 border rounded-lg p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        <button
          onClick={onEditClick}
          disabled={disabled}
          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:text-gray-400"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field, idx) => (
          <div
            key={idx}
            className={`bg-white p-3 rounded border ${
              field.missing ? "border-red-500" : "border-gray-200"
            }`}
          >
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              {field.label}
              {field.missing && <span className="text-red-500 ml-1">*</span>}
            </p>

            <p
              className={`text-sm break-words ${
                field.missing ? "text-red-600" : "text-gray-900"
              }`}
            >
              {field.value || "Not provided"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-gray-900">
        Review Your Application
      </h2>

      <p className="text-gray-600 mb-8">
        Please review all information below. Click "Edit" to make changes if
        needed.
      </p>

      <ReviewSection
        title="Basic Information"
        fields={basicFields}
        onEditClick={() => onEdit?.(1)}
      />

      <ReviewSection
        title="Financial Details"
        fields={financialFields}
        onEditClick={() => onEdit?.(2)}
      />

      <ReviewSection
        title="Documentation"
        fields={complianceFields}
        onEditClick={() => onEdit?.(3)}
      />

      <div
        className={`mb-8 p-4 rounded-lg border flex items-start gap-3 ${
          allStepsComplete
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <AlertCircle
          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
            allStepsComplete ? "text-green-600" : "text-amber-600"
          }`}
        />

        <div>
          <p
            className={`font-semibold ${
              allStepsComplete ? "text-green-900" : "text-amber-900"
            }`}
          >
            {allStepsComplete
              ? "Application Complete"
              : "Application Incomplete"}
          </p>

          <p
            className={`text-sm ${
              allStepsComplete ? "text-green-700" : "text-amber-700"
            }`}
          >
            {allStepsComplete
              ? "All fields are filled. Click Submit to send your application."
              : "Some required fields are missing. Save your draft to continue later."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step4;

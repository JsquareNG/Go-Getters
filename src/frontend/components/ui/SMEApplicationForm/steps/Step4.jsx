import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { generateDocKey } from "../utils/formHelpers";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

import {
  selectFormData,
  selectStepCompletion,
} from "@/store/applicationFormSlice";

/**
 * Step4ReviewSubmit
 * Pure review screen (submission handled by parent)
 */
const Step4 = ({ onEdit, disabled = false }) => {
  const data = useSelector(selectFormData);
  const stepCompletion = useSelector(selectStepCompletion);

  /* ------------------------------------------------ */
  /* ENTITY CONFIG */
  /* ------------------------------------------------ */
  const CONFIG_MAP = {
    SG: SINGAPORE_CONFIG,
    ID: INDONESIA_CONFIG,
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

  console.log(entityConfig);

  //TODO: currently id only able to retrieve normal fields, misses repeatableSections object
  const step2Config = getStepConfigById("step2"); // match your config
  const step3Config = getStepConfigById("step3"); // match your config
  const step4Config = getStepConfigById("step4"); // match your config

  //   console.log(step2Config);

  /* ------------------------------------------------ */
  /* HELPERS */
  /* ------------------------------------------------ */

  //TODO: implement the file upload component here with file info
  const formatDocumentName = (file) =>
    file
      ? `${file.name} (${(file.size / 1024).toFixed(2)} KB)`
      : "Not uploaded";

  const getFieldsFromStep = (stepConfig, stepData = {}) => {
    const fields = [];

    if (!stepConfig) return fields;

    // --- Helper to process normal/conditional fields ---
    const processFields = (fieldSet, data, prefix = "") => {
      Object.entries(fieldSet || {}).forEach(([key, cfg]) => {
        let value = data?.[key] ?? "";

        // Handle conditionalFields (like select/checkbox with extra subfields)
        if (cfg.conditionalFields && value in cfg.conditionalFields) {
          fields.push({
            label: prefix + cfg.label,
            value: value || "Not provided",
            missing:
              cfg.required &&
              (value === "" || value === null || value === undefined),
          });

          const subFields = cfg.conditionalFields[value];
          Object.entries(subFields).forEach(([subKey, subCfg]) => {
            fields.push({
              label: prefix + subCfg.label,
              value: data?.[subKey] || "Not provided",
              missing: subCfg.required && !data?.[subKey],
            });
          });
        } else {
          // Normal field
          if (value instanceof File) {
            value = `${value.name} (${(value.size / 1024).toFixed(2)} KB)`;
          } else if (typeof value === "object" && value !== null) {
            value = JSON.stringify(value, null, 2);
          } else if (value === "") {
            value = "Not provided";
          }

          fields.push({
            label: prefix + cfg.label,
            value,
            missing: cfg.required && value === "Not provided",
          });
        }
      });
    };

    // --- Top-level fields ---
    processFields(stepConfig.fields, stepData);

    // --- Repeatable sections (like Owners) ---
    Object.entries(stepConfig.repeatableSections || {}).forEach(
      ([sectionKey, sectionCfg]) => {
        const items = stepData?.[sectionKey] || [];
        items.forEach((item, idx) => {
          processFields(
            sectionCfg.fields,
            item,
            `${sectionCfg.label} ${idx + 1} - `,
          );
        });
      },
    );

    // --- Documents ---
    (stepConfig.documents || []).forEach((doc) => {
      const key = generateDocKey(doc);
      const file = stepData?.documents?.[key]?.file || stepData?.[key];
      fields.push({
        label: doc,
        value: file
          ? `${file.name} (${(file.size / 1024).toFixed(2)} KB)`
          : "Not uploaded",
        missing: !file,
      });
    });

    return fields;
  };

  /* ------------------------------------------------ */
  /* REVIEW FIELDS */
  /* ------------------------------------------------ */

  const isStepComplete = (stepConfig, formData = {}) => {
    if (!stepConfig) return true;

    const checkFields = (fields, data) => {
      for (const [key, cfg] of Object.entries(fields || {})) {
        const value = data?.[key];

        // Conditional fields
        if (cfg.conditionalFields && value in cfg.conditionalFields) {
          if (!checkFields(cfg.conditionalFields[value], data[key] || {})) {
            return false;
          }
        }

        // Required field check
        if (cfg.required) {
          if (
            value === null ||
            value === undefined ||
            (typeof value === "string" && value.trim() === "") ||
            (Array.isArray(value) && value.length === 0)
          ) {
            return false;
          }
        }
      }
      return true;
    };

    // Check normal fields
    if (!checkFields(stepConfig.fields, formData)) return false;

    // Check repeatable sections
    for (const [sectionKey, sectionCfg] of Object.entries(
      stepConfig.repeatableSections || {},
    )) {
      const items = formData?.[sectionKey] || [];

      // Section required but empty
      if (sectionCfg.required && items.length === 0) return false;

      // Each item
      for (const item of items) {
        if (!checkFields(sectionCfg.fields, item)) return false;
      }
    }

    // Check documents
    for (const doc of stepConfig.documents || []) {
      const key = generateDocKey(doc);
      const fileWrapper = formData?.documents?.[key];
      const file = fileWrapper?.file || formData?.[key];
      if (!file) return false;
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
  //   const allStepsComplete = allFields.every(
  //     (f) => f.value && f.value !== "Not provided",
  //   );
  const allStepsComplete =
    isStepComplete(step2Config, data) &&
    isStepComplete(step3Config, data) &&
    isStepComplete(step4Config, data);

  /* ------------------------------------------------ */
  /* STEP COMPLETION */
  /* ------------------------------------------------ */

  //   const allFields = [...basicFields, ...financialFields, ...complianceFields];
  //   const allStepsComplete = allFields.every(
  //     (f) => f.value && f.value !== "Not provided",
  //   );
  //   const allStepsComplete =
  //     stepCompletion[0] &&
  //     stepCompletion[1] &&
  //     stepCompletion[2] &&
  //     stepCompletion[3];

  /* ------------------------------------------------ */
  /* REVIEW SECTION */
  /* ------------------------------------------------ */

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

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field, idx) => (
          <div
            key={idx}
            className="bg-white p-3 rounded border border-gray-200"
          >
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              {field.label}
            </p>

            <p className="text-sm text-gray-900 break-words">
              {field.value || "Not provided"}
            </p>
          </div>
        ))}
      </div> */}
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

  /* ------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------ */

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

      {/* STATUS BANNER */}
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

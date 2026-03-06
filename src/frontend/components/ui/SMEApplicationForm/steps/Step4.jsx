import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { generateDocKey } from "../utils/formHelpers";
import SINGAPORE_CONFIG2 from "../config/updatedSingaporeConfig";

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
  const entityConfig = useMemo(
    () => SINGAPORE_CONFIG2.entities[data?.businessType] || {},
    [data?.businessType],
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

  console.log("entity", entityConfig);

  const step2Config = getStepConfigById("step1_basic_info"); // match your config
  const step3Config = getStepConfigById("step2_financial"); // match your config
  const step4Config = getStepConfigById("step3_compliance"); // match your config

  //   const step2Config = useMemo(
  //     () => entityConfig.steps?.find((s) => s.id === "step2") || {},
  //     [entityConfig],
  //   );

  //   const step3Config = useMemo(
  //     () => entityConfig.steps?.find((s) => s.id === "step3") || {},
  //     [entityConfig],
  //   );

  //   const step4Config = useMemo(
  //     () => entityConfig.steps?.find((s) => s.id === "step4") || {},
  //     [entityConfig],
  //   );

  /* ------------------------------------------------ */
  /* HELPERS */
  /* ------------------------------------------------ */

  const formatDocumentName = (file) =>
    file
      ? `${file.name} (${(file.size / 1024).toFixed(2)} KB)`
      : "Not uploaded";

  //   const flattenObject = (obj) => {
  //     if (!obj || typeof obj !== "object") return obj;

  //     return Object.entries(obj)
  //       .map(([k, v]) => {
  //         if (typeof v === "object") {
  //           return `${k}: ${flattenObject(v)}`;
  //         }
  //         return `${k}: ${v}`;
  //       })
  //       .join(", ");
  //   };
  //   const flattenObject = (obj, seen = new WeakSet()) => {
  //     if (!obj || typeof obj !== "object") return obj;
  //     if (seen.has(obj)) return "[Circular]";
  //     seen.add(obj);

  //     return Object.entries(obj)
  //       .map(([k, v]) => {
  //         if (v === null) return `${k}: null`;
  //         if (v instanceof File) return `${k}: ${v.name}`;
  //         if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
  //         if (typeof v === "object") return `${k}: {${flattenObject(v, seen)}}`; // recursive safely
  //         return `${k}: ${v}`;
  //       })
  //       .join(", ");
  //   };

  const getFieldsFromStep = (stepConfig) => {
    const fields = [];
    if (!stepConfig) return fields;

    /* NORMAL FIELDS */
    // Object.entries(stepConfig.fields || {}).forEach(([key, cfg]) => {
    //   let value = data?.[key] ?? "";

    //   if (typeof value === "object" && value !== null) {
    //     value = flattenObject(value);
    //   }

    //   fields.push({
    //     label: cfg.label,
    //     value,
    //   });
    // });

    /* REPEATABLE SECTIONS */
    if (stepConfig.repeatableSections) {
      Object.entries(stepConfig.repeatableSections).forEach(
        ([sectionKey, sectionCfg]) => {
          if (!key || key === "null") return; // skip null keys
          if (!cfg?.label) return; // skip fields without labels
          const items = data?.[sectionKey] || [];

          items.forEach((item, idx) => {
            Object.entries(sectionCfg.fields).forEach(([key, cfg]) => {
              let value = item[key];
              if (value && typeof value === "object") {
                if (Array.isArray(value)) {
                  value = value.join(", ");
                } else if (value instanceof File) {
                  value = formatDocumentName(value);
                } else {
                  value = JSON.stringify(value);
                }
              }
              fields.push({
                label: `${sectionCfg.label} ${idx + 1} - ${cfg.label}`,
                value: value || "Not provided",
              });
            });
          });
        },
      );
    }

    /* DOCUMENTS */
    (stepConfig.documents || []).forEach((doc) => {
      const key = generateDocKey(doc);
      const file = data?.documents?.[key]?.file || data?.[key];
      fields.push({
        label: doc,
        value: formatDocumentName(file),
      });
    });

    /* ADDITIONAL TOP-LEVEL FIELDS NOT IN CONFIG */
    Object.keys(data || {}).forEach((key) => {
      if (
        stepConfig.fields?.[key] ||
        (stepConfig.repeatableSections && stepConfig.repeatableSections[key]) ||
        (stepConfig.documents && stepConfig.documents.includes(key))
      )
        return;

      let value = data[key];
      if (value && typeof value === "object") {
        if (Array.isArray(value)) value = value.join(", ");
        else if (value instanceof File) value = formatDocumentName(value);
        else value = JSON.stringify(value);
      }
      fields.push({ label: key, value: value || "Not provided" });
    });

    return fields;
  };

  /* ------------------------------------------------ */
  /* REVIEW FIELDS */
  /* ------------------------------------------------ */

  //   const basicFields = useMemo(
  //     () => getFieldsFromStep(step2Config),
  //     [step2Config, data],
  //   );

  //   const financialFields = useMemo(
  //     () => getFieldsFromStep(step3Config),
  //     [step3Config, data],
  //   );

  //   const complianceFields = useMemo(
  //     () => getFieldsFromStep(step4Config),
  //     [step4Config, data],
  //   );

  const basicFields = useMemo(
    () => getFieldsFromStep(step2Config),
    [step2Config, data],
  );
  const financialFields = useMemo(
    () => getFieldsFromStep(step3Config),
    [step3Config, data],
  );
  const complianceFields = useMemo(
    () => getFieldsFromStep(step4Config),
    [step4Config, data],
  );

  const allFields = [...basicFields, ...financialFields, ...complianceFields];
  const allStepsComplete = allFields.every(
    (f) => f.value && f.value !== "Not provided",
  );

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        title="Compliance & Documentation"
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

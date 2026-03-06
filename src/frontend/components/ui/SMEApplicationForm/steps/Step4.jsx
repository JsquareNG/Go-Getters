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

  //   const getFieldsFromStep = (stepConfig, stepData = {}) => {
  //     const fields = [];

  //     if (!stepConfig) return fields;

  //     // --- Normal fields ---
  //     Object.entries(stepConfig.fields || {}).forEach(([key, cfg]) => {
  //       // Conditional fields
  //       if (cfg.condition && !cfg.condition(stepData)) return;

  //       let value = stepData[key] ?? "";
  //       const missing =
  //         cfg.required && (value === null || value === undefined || value === "");
  //       if (typeof value === "object" && value !== null)
  //         value = JSON.stringify(value, null, 2);

  //       fields.push({
  //         label: cfg.label,
  //         value: value || "Not provided",
  //         missing,
  //       });
  //     });

  //     // --- Repeatable sections ---
  //     Object.entries(stepConfig.repeatableSections || {}).forEach(
  //       ([sectionKey, sectionCfg]) => {
  //         const items = stepData[sectionKey] || [];
  //         items.forEach((item, idx) => {
  //           Object.entries(sectionCfg.fields || {}).forEach(([fKey, fCfg]) => {
  //             if (fCfg.condition && !fCfg.condition(item)) return;

  //             let value = item[fKey] ?? "";
  //             const missing =
  //               fCfg.required &&
  //               (value === null || value === undefined || value === "");
  //             if (value instanceof File) value = formatDocumentName(value);
  //             else if (Array.isArray(value)) value = value.join(", ");
  //             else if (typeof value === "object")
  //               value = JSON.stringify(value, null, 2);

  //             fields.push({
  //               label: `${sectionCfg.label} ${idx + 1} - ${fCfg.label || fKey}`,
  //               value: value || "Not provided",
  //               missing,
  //             });
  //           });
  //         });
  //       },
  //     );

  //     // --- Documents ---
  //     (stepConfig.documents || []).forEach((doc) => {
  //       const key = generateDocKey(doc);
  //       const file = stepData?.documents?.[key]?.file || stepData?.[key];
  //       const missing = !file;
  //       fields.push({ label: doc, value: formatDocumentName(file), missing });
  //     });

  //     return fields;
  //   };

  function getFieldsFromStep(stepConfig, stepData = {}) {
    const fields = [];

    const processFields = (fieldSet, data) => {
      Object.entries(fieldSet || {}).forEach(([key, cfg]) => {
        let value = data?.[key] ?? "";
        let missing =
          cfg.required &&
          (value === "" || value === null || value === undefined);

        // Handle conditionalFields
        if (cfg.conditionalFields && value in cfg.conditionalFields) {
          // Only show fields under this conditional key
          const conditional = cfg.conditionalFields[value];
          fields.push({
            label: cfg.label,
            value: value || "Not provided",
            missing,
          });
          fields.push(...processFields(conditional, data[key] || {}));
        } else if (!cfg.conditionalFields) {
          // Normal field
          fields.push({
            label: cfg.label,
            value: value || "Not provided",
            missing,
          });
        }
      });
      return fields;
    };

    // Step fields
    fields.push(...processFields(stepConfig.fields, stepData));

    // Repeatable sections
    Object.entries(stepConfig.repeatableSections || {}).forEach(
      ([sectionKey, sectionCfg]) => {
        const items = stepData?.[sectionKey] || [];
        items.forEach((item, idx) => {
          fields.push(
            ...processFields(sectionCfg.fields, item).map((f) => ({
              ...f,
              label: `${sectionCfg.label} ${idx + 1} - ${f.label}`,
            })),
          );
        });
      },
    );

    return fields;
  }
  //   const getFieldsFromStep = (stepConfig) => {
  //     const fields = [];
  //     if (!stepConfig) return fields;

  //     // --- Normal fields ---
  //     Object.entries(stepConfig.fields || {}).forEach(([key, cfg]) => {
  //       let value = data?.[key] ?? "";
  //       const missing =
  //         cfg.required && (value === null || value === undefined || value === "");
  //       if (typeof value === "object" && value !== null)
  //         value = JSON.stringify(value, null, 2);

  //       fields.push({
  //         label: cfg.label,
  //         value: value || "Not provided",
  //         missing,
  //       });
  //     });

  //     // --- Repeatable sections ---
  //     Object.entries(stepConfig.repeatableSections || {}).forEach(
  //       ([sectionKey, sectionCfg]) => {
  //         const items = data?.[sectionKey] || [];

  //         items.forEach((item, idx) => {
  //           Object.entries(sectionCfg.fields || {}).forEach(([fKey, fCfg]) => {
  //             let value = item[fKey] ?? "";
  //             const missing =
  //               fCfg.required &&
  //               (value === null || value === undefined || value === "");
  //             if (value instanceof File) value = formatDocumentName(value);
  //             else if (Array.isArray(value)) value = value.join(", ");
  //             else if (typeof value === "object")
  //               value = JSON.stringify(value, null, 2);

  //             fields.push({
  //               label: `${sectionCfg.label} ${idx + 1} - ${fCfg.label || fKey}`,
  //               value: value || "Not provided",
  //               missing,
  //             });
  //           });
  //         });
  //       },
  //     );

  //     // --- Documents ---
  //     (stepConfig.documents || []).forEach((doc) => {
  //       const key = generateDocKey(doc);
  //       const file = data?.documents?.[key]?.file || data?.[key];
  //       const missing = !file;
  //       fields.push({
  //         label: doc,
  //         value: formatDocumentName(file),
  //         missing,
  //       });
  //     });

  //     return fields;
  //   };

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

  //   const isStepComplete = (stepConfig, formData) => {
  //     if (!stepConfig) return true;

  //     // --- Normal fields ---
  //     for (const [key, cfg] of Object.entries(stepConfig.fields || {})) {
  //       const value = formData[key];
  //       if (
  //         cfg.required &&
  //         (value === null || value === undefined || value === "")
  //       ) {
  //         return false;
  //       }
  //     }

  //     // --- Repeatable sections ---
  //     for (const [sectionKey, sectionCfg] of Object.entries(
  //       stepConfig.repeatableSections || {},
  //     )) {
  //       const items = formData[sectionKey] || [];
  //       if (sectionCfg.required && items.length === 0) return false;

  //       for (const item of items) {
  //         for (const [fKey, fCfg] of Object.entries(sectionCfg.fields || {})) {
  //           const value = item[fKey];
  //           if (
  //             fCfg.required &&
  //             (value === null || value === undefined || value === "")
  //           ) {
  //             return false;
  //           }
  //         }
  //       }
  //     }

  //     // --- Documents ---
  //     for (const doc of stepConfig.documents || []) {
  //       const key = generateDocKey(doc);
  //       const fileWrapper = formData?.documents?.[key];
  //       const file = fileWrapper?.file || formData?.[key];
  //       if (!file) return false;
  //     }

  //     return true;
  //   };
  const isStepComplete = (stepConfig, formData = {}) => {
    if (!stepConfig) return true;

    const checkFields = (fields, data) => {
      for (const [key, cfg] of Object.entries(fields || {})) {
        const value = data?.[key];

        // If the field has conditionalFields, check the relevant branch
        if (cfg.conditionalFields && value in cfg.conditionalFields) {
          if (!checkFields(cfg.conditionalFields[value], data[key] || {})) {
            return false;
          }
        }

        // Regular required field check
        if (
          cfg.required &&
          (value === null || value === undefined || value === "")
        ) {
          return false;
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

      // Section required but no items
      if (sectionCfg.required && items.length === 0) return false;

      // Check each item
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
  console.log(data);

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

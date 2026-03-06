import React, { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../../primitives/Button";
import SINGAPORE_CONFIG from "../config/singaporeConfig";

import {
  selectFormData,
  selectStepCompletion,
  submitApplication,
  saveDraft,
} from "@/store/applicationFormSlice";

/**
 * Step4ReviewSubmit component (Redux-only)
 * - Reads formData and stepCompletion directly from Redux store
 * - Handles draft/save and submission via dispatch
 */
const Step4ReviewSubmit = ({ onEdit, disabled = false }) => {
  const dispatch = useDispatch();
  const data = useSelector(selectFormData);
  const stepCompletion = useSelector(selectStepCompletion);

  // ---- Entity and step configs ----
  const entityConfig = useMemo(
    () => SINGAPORE_CONFIG.entities[data?.businessType] || {},
    [data?.businessType],
  );

  const step2Config = useMemo(
    () => entityConfig.steps?.find((s) => s.id === "step2") || {},
    [entityConfig],
  );
  const step3Config = useMemo(
    () => entityConfig.steps?.find((s) => s.id === "step3") || {},
    [entityConfig],
  );
  const step4Config = useMemo(
    () => entityConfig.steps?.find((s) => s.id === "step4") || {},
    [entityConfig],
  );

  // ---- Helpers ----
  const formatDocumentName = (file) =>
    file
      ? `${file.name} (${(file.size / 1024).toFixed(2)} KB)`
      : "Not uploaded";

  const getFieldsFromStep = (stepConfig, sectionData) => {
    const fields = [];
    if (!stepConfig) return fields;

    // Normal fields
    Object.entries(stepConfig.fields || {}).forEach(([key, cfg]) => {
      // let value = sectionData?.[key] ?? "";
      let value = sectionData?.[key] ?? "";

      if (typeof value === "object" && value !== null) {
        value = Object.entries(value)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
      }
      if (
        cfg.type === "checkbox" &&
        cfg.conditionalFields &&
        sectionData?.[key]
      ) {
        const subFields = cfg.conditionalFields[sectionData[key]];
        if (subFields) {
          Object.entries(subFields).forEach(([subKey, subCfg]) => {
            fields.push({
              label: subCfg.label,
              value: sectionData?.[subKey] ?? "",
            });
          });
        }
      }
      fields.push({ label: cfg.label, value });
    });

    // Repeatable sections
    if (stepConfig.repeatableSections) {
      Object.entries(stepConfig.repeatableSections).forEach(
        ([sectionKey, sectionCfg]) => {
          const items = sectionData?.[sectionKey] || [];
          items.forEach((item, idx) => {
            Object.entries(sectionCfg.fields).forEach(([key, cfg]) => {
              fields.push({
                label: `${sectionCfg.label} ${idx + 1} - ${cfg.label}`,
                value: item[key] || "",
              });
            });
          });
        },
      );
    }

    // Documents
    (stepConfig.documents || []).forEach((doc) => {
      // const key = doc.toLowerCase().replace(/[^\w]+/g, "_");
      const key = doc
        .toLowerCase()
        .replace(/[^\w]+/g, " ")
        .trim()
        .replace(/\s+/g, "_");
      fields.push({
        label: doc,
        value: formatDocumentName(sectionData?.documents?.[key]?.file),
      });
    });

    return fields;
  };

  // ---- Review fields ----
  // const basicFields = useMemo(
  //   () => getFieldsFromStep(step2Config, data.basicFields),
  //   [step2Config, data],
  // );
  // const financialFields = useMemo(
  //   () => getFieldsFromStep(step3Config, data.financialFields),
  //   [step3Config, data],
  // );
  // const complianceFields = useMemo(
  //   () => getFieldsFromStep(step4Config, data.complianceFields),
  //   [step4Config, data],
  // );
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

  // ---- Submission readiness ----
  const allStepsComplete =
    stepCompletion[0] &&
    stepCompletion[1] &&
    stepCompletion[2] &&
    stepCompletion[3];

  const handleButtonClick = () => {
    if (allStepsComplete) {
      dispatch(submitApplication());
    } else {
      dispatch(saveDraft());
    }
  };

  // ---- Review Section component ----
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
          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
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
            {/* <p className="text-sm text-gray-900 break-words">{field.value || "Not provided"}</p> */}
            <p className="text-sm text-gray-900 break-words">
              {typeof field.value === "object"
                ? Object.entries(field.value)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")
                : field.value || "Not provided"}
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
        onEditClick={() => onEdit(1)}
      />
      <ReviewSection
        title="Financial Details"
        fields={financialFields}
        onEditClick={() => onEdit(2)}
      />
      <ReviewSection
        title="Compliance & Documentation"
        fields={complianceFields}
        onEditClick={() => onEdit(3)}
      />

      {/* Status Banner */}
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
            className={`font-semibold ${allStepsComplete ? "text-green-900" : "text-amber-900"}`}
          >
            {allStepsComplete
              ? "Application Complete"
              : "Application Incomplete"}
          </p>
          <p
            className={`text-sm ${allStepsComplete ? "text-green-700" : "text-amber-700"}`}
          >
            {allStepsComplete
              ? "All fields are filled. Click Submit to send your application."
              : "Some required fields are missing. Click Save Draft to save your progress."}
          </p>
        </div>
      </div>

      {/* save draft button which is not needed here */}
      {/* <Button
        onClick={handleButtonClick}
        disabled={disabled}
        variant={allStepsComplete ? "default" : "outline"}
      >
        {allStepsComplete ? "Submit Application" : "Save Draft"}
      </Button> */}
    </div>
  );
};

export default Step4ReviewSubmit;

import React, { useMemo } from "react";
import FieldRenderer from "../components/FieldRenderer";
import ConditionalFieldsRenderer from "../components/ConditionalFieldsRenderer";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

const Step2FinancialDetails = ({
  data,
  onFieldChange,
  disabled = false,
  ocrState = {},
  verificationState = {},
  beforeAcceptFile,
}) => {
  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  const activeConfig = CONFIG_MAP[data?.country] || SINGAPORE_CONFIG;

  const { financialFieldsConfig, repeatableSectionsConfig } = useMemo(() => {
    const entity = activeConfig.entities?.[data?.businessType] || {};
    const step3 = entity.steps?.find((s) => s.id === "step3") || {};

    return {
      financialFieldsConfig: step3.fields || {},
      repeatableSectionsConfig: step3.repeatableSections || {},
    };
  }, [activeConfig, data?.businessType]);

  const getFormDataRoot = () => {
    if (data?.formData && Object.keys(data.formData).length > 0) {
      return data.formData;
    }
    return data || {};
  };

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

  const renderField = (fieldKey, fieldConfig, parentPath = "") => {
    const fullPath = parentPath ? `${parentPath}.${fieldKey}` : fieldKey;
    const value =
      getNestedValue(getFormDataRoot(), fullPath) ??
      getNestedValue(data, fullPath);

    if (
      typeof fieldConfig === "object" &&
      !fieldConfig.type &&
      !fieldConfig.label &&
      !fieldConfig.conditionalFields
    ) {
      return (
        <div key={fullPath} className="mb-6">
          <p className="font-semibold text-gray-900 mb-2">
            {fieldKey.replace(/([A-Z])/g, " $1").trim()}
          </p>

          {Object.entries(fieldConfig).map(([subKey, subCfg]) =>
            renderField(subKey, subCfg, fullPath),
          )}
        </div>
      );
    }

    if (fieldConfig?.conditionalFields) {
      return (
        <ConditionalFieldsRenderer
          key={fullPath}
          fieldKey={fullPath}
          fieldConfig={fieldConfig}
          value={value}
          rowData={getFormDataRoot()}
          onChange={(name, nextValue) => handleFieldChange(name, nextValue)}
          disabled={disabled}
          context={{
            data,
            ocrState,
            verificationState,
            beforeAcceptFile,
          }}
        />
      );
    }

    return (
      <FieldRenderer
        key={fullPath}
        fieldKey={fullPath}
        fieldConfig={fieldConfig}
        value={value}
        onChange={(name, nextValue) => handleFieldChange(name, nextValue)}
        disabled={disabled}
        context={{
          data,
          ocrState,
          verificationState,
          beforeAcceptFile,
        }}
      />
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Financial Details
      </h2>

      {Object.entries(financialFieldsConfig).map(([fieldKey, fieldConfig]) =>
        renderField(fieldKey, fieldConfig),
      )}

      {Object.keys(repeatableSectionsConfig).length > 0 && (
        <div className="mt-6">
          {Object.entries(repeatableSectionsConfig).map(
            ([sectionKey, sectionConfig]) => (
              <div key={sectionKey} className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">
                  {sectionConfig.label}
                </h3>

                {Object.entries(sectionConfig.fields || {}).map(
                  ([fieldKey, fieldConfig]) =>
                    renderField(fieldKey, fieldConfig, sectionKey),
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default Step2FinancialDetails;
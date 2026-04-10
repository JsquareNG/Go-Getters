import React, { useEffect } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import { Info } from "lucide-react";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

/**
 * Step0Brief component
 * Collects SME country of operation and business type
 * Once "start application", these fields will not change
 */
const Step0Brief = ({
  data,
  onFieldChange,
  disabled = false,
  locked,
  ...props
}) => {
  const currentCountry = data.country || "";
  const currentBusinessType = data.businessType || "";

  const CONFIG_MAP = {
    Singapore: SINGAPORE_CONFIG,
    Indonesia: INDONESIA_CONFIG,
  };

  // Country options
  const countryOptions = [
    {
      label: SINGAPORE_CONFIG.country?.name || "Singapore",
      value: SINGAPORE_CONFIG.country?.name || "Singapore",
    },
    {
      label: INDONESIA_CONFIG.country?.name || "Indonesia",
      value: INDONESIA_CONFIG.country?.name || "Indonesia",
    },
  ];

  const activeConfig = CONFIG_MAP[currentCountry] || {};

  const businessTypeOptions = activeConfig.entities
    ? Object.entries(activeConfig.entities).map(([key, entity]) => ({
        label: entity?.label || key,
        value: key,
      }))
    : [];

  useEffect(() => {
    if (!currentCountry) return;
    if (!currentBusinessType) return;

    if (!activeConfig.entities?.[currentBusinessType]) {
      onFieldChange("businessType", "");
    }
  }, [currentCountry]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Before we get started, tell us about your business.
      </h2>

      {/* Info panel */}
      <div className=" flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 mb-5">
        <Info className="h-4 w-4 text-blue-500 mt-0.5" />

        <p className="text-xs text-blue-700">
          These fields cannot be changed after starting the application. Please delete application if you wish to restart.
        </p>
      </div>

      {/* Country Selection */}
      <FormFieldGroup
        fieldName="country"
        label="Country of Operation"
        value={data.country || ""}
        onChange={onFieldChange}
        type="select"
        options={countryOptions}
        required
        disabled={disabled || locked}
      />

      {/* Business Type */}
      <FormFieldGroup
        fieldName="businessType"
        label="Business Type"
        value={data.businessType || ""}
        onChange={onFieldChange}
        type="select"
        options={businessTypeOptions}
        required
        disabled={!data.country || disabled || locked}
      />
    </div>
  );
};

export default Step0Brief;

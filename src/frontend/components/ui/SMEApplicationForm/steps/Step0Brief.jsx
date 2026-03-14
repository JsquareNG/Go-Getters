import React, { useEffect } from "react";
import FormFieldGroup from "../components/FormFieldGroup";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";

/**
 * Step0Brief component
 * Collects SME country of operation and business type
 */
const Step0Brief = ({ data, onFieldChange, disabled = false }) => {
  const currentCountry = data.country || "";
  const currentBusinessType = data.businessType || "";

  const CONFIG_MAP = {
    SG: SINGAPORE_CONFIG,
    ID: INDONESIA_CONFIG,
  };

  // Country options
  const countryOptions = [
    {
      label: SINGAPORE_CONFIG.country?.name || "Singapore",
      value: SINGAPORE_CONFIG.country?.code || "SG",
    },
    {
      label: INDONESIA_CONFIG.country?.name || "Indonesia",
      value: INDONESIA_CONFIG.country?.code || "ID",
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

      {/* Country Selection */}
      <FormFieldGroup
        fieldName="country"
        label="Country of Operation"
        value={data.country || ""}
        onChange={(value) => onFieldChange("country", value)}
        // onChange={onFieldChange}
        type="select"
        options={countryOptions}
        required
        disabled={disabled}
      />

      {/* Business Type */}
      <FormFieldGroup
        fieldName="businessType"
        label="Business Type"
        value={data.businessType || ""}
        // onChange={onFieldChange}
        onChange={(value) => onFieldChange("businessType", value)}
        type="select"
        options={businessTypeOptions}
        required
        disabled={!data.country || disabled}
      />
    </div>
  );
};

export default Step0Brief;

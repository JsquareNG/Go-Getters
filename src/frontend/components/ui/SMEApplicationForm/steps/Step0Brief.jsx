import React, { useEffect } from "react";
import { useDispatch } from "react-redux";

import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";
import SINGAPORE_CONFIG2 from "../config/updatedSingaporeConfig";

import {
  // selectFormData,
  updateField,
  startNewApplication,
} from "@/store/applicationFormSlice";

/**
 * Step0Brief component
 * Collects SME country of operation and business type
 */
const Step0Brief = ({ data, onFieldChange, disabled = false }) => {
  const dispatch = useDispatch();

  const currentCountry = data.country || "";
  const currentBusinessType = data.businessType || "";

  // Country options
  const countryOptions = [
    {
      label: SINGAPORE_CONFIG2.country?.name || "Singapore",
      value: SINGAPORE_CONFIG2.country?.code || "SG",
    },
  ];

  // Business types
  const businessTypeOptions =
    currentCountry === "SG" && SINGAPORE_CONFIG2.entities
      ? Object.entries(SINGAPORE_CONFIG2.entities).map(([key, entity]) => ({
          label: entity?.label || key,
          value: key,
        }))
      : [];

  // Start new draft if none exists
  useEffect(() => {
    if (!data || Object.keys(data).length === 0) {
      dispatch(startNewApplication());
    }
  }, [dispatch, data]);

  // Reset business type if country changes
  useEffect(() => {
    if (currentCountry !== "SG" && currentBusinessType) {
      dispatch(updateField({ field: "businessType", value: "" }));
    }
  }, [currentCountry, currentBusinessType, dispatch]);

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
        onChange={onFieldChange}
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
        onChange={onFieldChange}
        type="select"
        options={businessTypeOptions}
        required
        disabled={!data.country || disabled}
      />
    </div>
  );
};

export default Step0Brief;

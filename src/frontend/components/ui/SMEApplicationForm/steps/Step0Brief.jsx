import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";

import {
  selectFormData,
  updateField,
  startNewApplication,
} from "@/store/applicationFormSlice";

/**
 * Step0Brief component
 * Collects SME country of operation and business type
 */
const Step0Brief = ({ data, onFieldChange, disabled = false }) => {
  const dispatch = useDispatch();
  const formData = useSelector(selectFormData);

  // // Log formData whenever it changes
  // useEffect(() => {
  //   console.log("Form Data changed:", formData);
  // }, [formData]);

  const currentCountry = formData.country || "";
  const currentBusinessType = formData.businessType || "";

  // Country options
  const countryOptions = [
    {
      label: SINGAPORE_CONFIG.country?.name || "Singapore",
      value: SINGAPORE_CONFIG.country?.code || "SG",
    },
  ];

  // Business types
  const businessTypeOptions =
    currentCountry === "SG" && SINGAPORE_CONFIG.entities
      ? Object.entries(SINGAPORE_CONFIG.entities).map(([key, entity]) => ({
          label: entity?.label || key,
          value: key,
        }))
      : [];

  // Start new draft if none exists
  useEffect(() => {
    if (!formData || Object.keys(formData).length === 0) {
      dispatch(startNewApplication());
    }
  }, [dispatch, formData]);

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
        value={formData.country || ""}
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
        value={formData.businessType || ""}
        onChange={onFieldChange}
        type="select"
        options={businessTypeOptions}
        required
        disabled={!formData.country || disabled}
      />
    </div>
  );
};

export default Step0Brief;

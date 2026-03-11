import React, { useEffect } from "react";
import { useDispatch } from "react-redux";

import FormFieldGroup from "../components/FormFieldGroup";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "../config";
import { useSelector } from "react-redux";
import { selectUser } from "@//store/authSlice";
import { getApplicationsByUserId } from "@/api/applicationApi";

import {
  // selectFormData,
  saveDraft,
  resetForm,
  updateField,
  startNewApplication,
} from "@/store/applicationFormSlice";

/**
 * Step0Brief component
 * Collects SME country of operation and business type
 */
const Step0Brief = ({ data, onFieldChange, disabled = false }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const user_id = user.user_id;

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

  // Business types
  // const businessTypeOptions =
  //   currentCountry === "SG" && SINGAPORE_CONFIG2.entities
  //     ? Object.entries(SINGAPORE_CONFIG2.entities).map(([key, entity]) => ({
  //         label: entity?.label || key,
  //         value: key,
  //       }))
  //     : [];
  const businessTypeOptions = activeConfig.entities
    ? Object.entries(activeConfig.entities).map(([key, entity]) => ({
        label: entity?.label || key,
        value: key,
      }))
    : [];

  const { currentApplicationId } = useSelector(
    (state) => state.applicationForm,
  );

  // Start new draft if none exists
  useEffect(() => {
    if (!user_id || currentApplicationId) return;

    const initApplication = async () => {
      try {
        const applications = await getApplicationsByUserId(user_id);

        const draft = applications.find((app) => !app.submitted);

        if (draft) {
          dispatch(
            loadDraft({
              appId: draft.id,
              data: draft.form_data || {},
            }),
          );
        } else {
          dispatch(resetForm());
          dispatch(startNewApplication());
        }
      } catch (err) {
        console.error("Failed to fetch user applications", err);
        dispatch(resetForm());
        dispatch(startNewApplication());
      }
    };

    initApplication();
  }, [user_id, currentApplicationId, dispatch]);

  // Reset business type if country changes
  useEffect(() => {
    if (currentBusinessType && !activeConfig.entities?.[currentBusinessType]) {
      dispatch(updateField({ field: "businessType", value: "" }));
    }
  }, [currentCountry, currentBusinessType, activeConfig, dispatch]);

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

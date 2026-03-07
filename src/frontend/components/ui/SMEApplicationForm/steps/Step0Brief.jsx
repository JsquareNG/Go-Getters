import React, { useEffect } from "react";
import { useDispatch } from "react-redux";

import FormFieldGroup from "../components/FormFieldGroup";
import SINGAPORE_CONFIG from "../config/singaporeConfig";
import SINGAPORE_CONFIG2 from "../config/updatedSingaporeConfig";
import { useSelector } from "react-redux";
import { selectUser } from "../../../../store/authSlice";
import { getApplicationsByUserId } from "../../../../api/applicationApi";

import {
  // selectFormData,
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
  // console.log(user);
  const { currentApplicationId } = useSelector(
    (state) => state.applicationForm,
  );

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
    const initApplication = async () => {
      if (!user_id) return;

      try {
        const applications = await getApplicationsByUserId(user_id);

        // Look for a draft (not submitted yet)
        const draft = applications.find((app) => !app.submitted);

        if (draft) {
          // Load draft into Redux
          dispatch(setFormData(draft.data));
          dispatch(setStepCompletion(draft.stepCompletion));
        } else {
          // Reset Redux and start new
          dispatch(resetForm());
          dispatch(startNewApplication());
        }
      } catch (err) {
        console.error("Failed to fetch user applications", err);
        // fallback: start new
        dispatch(resetForm());
        dispatch(startNewApplication());
      }
    };

    initApplication();
  }, [user_id, dispatch]);
  // useEffect(() => {
  //   if (!currentApplicationId) {
  //     dispatch(resetForm());
  //     dispatch(startNewApplication());
  //   }
  // }, [dispatch, currentApplicationId]);

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

import { useReducer, useCallback, useMemo } from "react";
import SINGAPORE_CONFIG from "../config/singaporeConfig";
import { uploadDocumentApi } from "@/api/documentApi";

// ------------------ INITIAL STATE ------------------
const initialState = {
  currentStep: 0,
  data: {
    country: "",
    businessType: "",
    // Step 2: Basic Info
    ...Object.fromEntries(
      Object.keys(
        SINGAPORE_CONFIG.entities.sole_proprietorship.steps[0].fields,
      ).map((k) => [k, ""]),
    ),
    owners: [], // repeatable section for step2
    // Step 3: Financial Details
    ...Object.fromEntries(
      Object.keys(
        SINGAPORE_CONFIG.entities.sole_proprietorship.steps[1].fields,
      ).map((k) => [k, ""]),
    ),
    partnerFinancials: [], // repeatable section for step3 if applicable
    // Step 4: Documents
    documents: {},
    errors: {},
    touched: {},
  },
};

// ------------------ REDUCER ------------------
const formReducer = (state, action) => {
  switch (action.type) {
    // case "SET_FIELD":
    //   return {
    //     ...state,
    //     data: {
    //       ...state.data,
    //       [action.payload.fieldName]: action.payload.value,
    //       errors: { ...state.data.errors, [action.payload.fieldName]: "" },
    //       touched: { ...state.data.touched, [action.payload.fieldName]: true },
    //     },
    //   };

    case "SET_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.fieldName]: action.payload.value,
          errors: { ...state.data.errors, [action.payload.fieldName]: "" },
          touched: { ...state.data.touched, [action.payload.fieldName]: true },
        },
      };

    case "SET_REPEATABLE_SECTION":
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.section]: action.payload.value,
        },
      };

    case "SET_DOCUMENT":
      return {
        ...state,
        data: {
          ...state.data,
          documents: {
            ...state.data.documents,
            [action.payload.documentType]: action.payload.file,
          },
        },
      };

    case "SET_ERROR":
      return {
        ...state,
        data: {
          ...state.data,
          errors: {
            ...state.data.errors,
            [action.payload.fieldName]: action.payload.error,
          },
        },
      };

    case "NEXT_STEP":
      return { ...state, currentStep: state.currentStep + 1 };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
};

// ------------------ HOOK ------------------
export const useSMEApplicationForm = () => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  // ------------------ FIELD SETTERS ------------------
  const setField = useCallback((fieldName, value) => {
    dispatch({ type: "SET_FIELD", payload: { fieldName, value } });
  }, []);

  const setRepeatableSection = useCallback((section, value) => {
    dispatch({ type: "SET_REPEATABLE_SECTION", payload: { section, value } });
  }, []);

  const setDocument = useCallback((documentType, file) => {
    dispatch({ type: "SET_DOCUMENT", payload: { documentType, file } });
  }, []);

  const setError = useCallback((fieldName, error) => {
    dispatch({ type: "SET_ERROR", payload: { fieldName, error } });
  }, []);

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);
  const goToStep = useCallback(
    (step) => dispatch({ type: "SET_STEP", payload: step }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  // ------------------ UPLOAD ------------------
  const uploadDocument = useCallback(
    async (documentType, file, { onProgress } = {}) => {
      dispatch({ type: "SET_DOCUMENT", payload: { documentType, file } });
      const payload = {
        application_id: "YOUR_APP_ID",
        document_type: documentType,
        filename: file.name,
        mime_type: file.type,
      };
      try {
        const uploaded = await uploadDocumentApi(payload, file, (pct) => {
          if (onProgress) onProgress(pct);
        });
        return uploaded;
      } catch (err) {
        setError(documentType, "Upload failed");
        throw err;
      }
    },
    [setError],
  );

  // ------------------ VALIDATION HELPERS ------------------
  const validateFieldsFromConfig = (fieldsConfig, dataSection) => {
    return Object.entries(fieldsConfig).every(([key, field]) => {
      if (!field.required) return true;
      const value = dataSection[key];
      return value !== undefined && value !== null && value !== "";
    });
  };

  const validateRepeatableSections = (repeatableSections, dataSection) => {
    if (!repeatableSections) return true;
    return Object.entries(repeatableSections).every(
      ([sectionKey, sectionConfig]) => {
        const items = dataSection[sectionKey] || [];
        if (items.length < (sectionConfig.min || 0)) return false;
        return items.every((item) =>
          validateFieldsFromConfig(sectionConfig.fields, item),
        );
      },
    );
  };

  // ------------------ VALIDATE CURRENT STEP ------------------
  const validateCurrentStep = useCallback(() => {
    const { data } = state;
    const entityType = data.businessType;
    if (!entityType) return false;

    const entityConfig = SINGAPORE_CONFIG.entities[entityType];
    if (!entityConfig) return false;

    const steps = entityConfig.steps;

    const step2Config = steps.find((s) => s.id === "step2");
    const step3Config = steps.find((s) => s.id === "step3");
    const step4Config = steps.find((s) => s.id === "step4");

    const step2Valid =
      validateFieldsFromConfig(step2Config.fields, data) &&
      validateRepeatableSections(step2Config.repeatableSections, data);

    const step3Valid =
      validateFieldsFromConfig(step3Config.fields, data) &&
      validateRepeatableSections(step3Config.repeatableSections, data);

    const step4Docs = step4Config.documents || [];
    const step4DocsValid = step4Docs.every((doc) => data.documents[doc]);

    // Step 4 is only valid if steps 2-4 are complete
    if (state.currentStep === 4) {
      return step2Valid && step3Valid && step4DocsValid;
    }

    // Otherwise validate current step only
    switch (state.currentStep) {
      case 0:
        return !!data.country && !!data.businessType;
      case 1:
        return step2Valid;
      case 2:
        return step3Valid;
      case 3:
        return step4DocsValid;
      default:
        return false;
    }
  }, [state]);

  // ------------------ LOCK STEP 4 ------------------
  const isStepLocked = (stepNum) => {
    const { data } = state;

    // Step 0 is never locked
    if (stepNum === 0) return false;

    // Lock all steps if Step 0 is not complete
    const step0Valid = !!data.country?.trim() && !!data.businessType?.trim();
    if (!step0Valid) return true;

    // Step 4: lock if current steps aren't valid
    if (stepNum === 4) return !validateCurrentStep();

    // Steps 1-3 unlocked if Step 0 is valid
    return false;
  };

  return {
    state,
    setField,
    setRepeatableSection,
    setDocument,
    uploadDocument,
    setError,
    nextStep,
    prevStep,
    goToStep,
    reset,
    validateCurrentStep,
    isStepLocked,
  };
};

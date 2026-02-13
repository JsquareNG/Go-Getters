/**
 * Hook to manage form state with dynamic field validation
 * Handles form data, validation state, and form navigation
 */

import { useReducer, useCallback, useMemo } from "react";
import { validateField, validateFile } from "../config/validationRules";
import { COUNTRIES } from "../config/countriesConfig";
import { BUSINESS_TYPES } from "../config/businessTypesConfig";
import { uploadDocumentApi } from "@/api/documentApi";

// Initial form state structure
const initialState = {
  currentStep: 0,
  data: {
    //Step 0: Brief Information
    country: "",
    businessType: "",

    // Step 1: Basic Information
    companyName: "",
    registrationNumber: "",
    // country: "",
    // businessType: "",
    email: "",
    phone: "",

    // Step 2: Financial Details
    bankAccountNumber: "",
    swift: "",
    currency: "",
    annualRevenue: "",
    taxId: "",

    // Step 3: Compliance & Documentation
    documents: {
      kycDocument: null,
      businessLicense: null,
      proofOfAddress: null,
    },
    // Upload progress per document (0-100)
    documentsProgress: {},
    // Server metadata for uploaded documents
    documentsMeta: {},

    // Dynamic country-specific fields
    countrySpecificFields: {},

    // Dynamic business-type-specific fields
    businessTypeSpecificFields: {},
  },
  errors: {},
  touched: {},
};

// Reducer function to handle form state updates
const formReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.fieldName]: action.payload.value,
        },
        errors: {
          ...state.errors,
          [action.payload.fieldName]: "",
        },
        touched: {
          ...state.touched,
          [action.payload.fieldName]: true,
        },
      };

    case "SET_COUNTRY_SPECIFIC_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          countrySpecificFields: {
            ...state.data.countrySpecificFields,
            [action.payload.fieldName]: action.payload.value,
          },
        },
        errors: {
          ...state.errors,
          [action.payload.fieldName]: "",
        },
        touched: {
          ...state.touched,
          [action.payload.fieldName]: true,
        },
      };

    case "SET_BUSINESS_TYPE_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          businessTypeSpecificFields: {
            ...state.data.businessTypeSpecificFields,
            [action.payload.fieldName]: action.payload.value,
          },
        },
        errors: {
          ...state.errors,
          [action.payload.fieldName]: "",
        },
        touched: {
          ...state.touched,
          [action.payload.fieldName]: true,
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
        errors: {
          ...state.errors,
          [action.payload.documentType]: "",
        },
        touched: {
          ...state.touched,
          [action.payload.documentType]: true,
        },
      };

    case "SET_ERROR":
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.fieldName]: action.payload.error,
        },
      };

    case "NEXT_STEP":
      return {
        ...state,
        currentStep: state.currentStep + 1,
      };

    case "PREV_STEP":
      return {
        ...state,
        currentStep: Math.max(0, state.currentStep - 1),
      };

    case "SET_UPLOAD_PROGRESS":
      return {
        ...state,
        data: {
          ...state.data,
          documentsProgress: {
            ...state.data.documentsProgress,
            [action.payload.documentType]: action.payload.progress,
          },
        },
      };

    case "SET_DOCUMENT_META":
      return {
        ...state,
        data: {
          ...state.data,
          documentsMeta: {
            ...state.data.documentsMeta,
            [action.payload.documentType]: action.payload.meta,
          },
        },
      };

    case "SET_STEP":
      return {
        ...state,
        currentStep: action.payload,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
};

/**
 * Custom hook for managing SME application form state
 * @returns {object} Form state, setters, and validators
 */
export const useSMEApplicationForm = () => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  // Set a regular field value
  const setField = useCallback((fieldName, value) => {
    dispatch({
      type: "SET_FIELD",
      payload: { fieldName, value },
    });
  }, []);

  // Set a country-specific field value
  const setCountrySpecificField = useCallback((fieldName, value) => {
    dispatch({
      type: "SET_COUNTRY_SPECIFIC_FIELD",
      payload: { fieldName, value },
    });
  }, []);

  // Set a business-type-specific field value
  const setBusinessTypeField = useCallback((fieldName, value) => {
    dispatch({
      type: "SET_BUSINESS_TYPE_FIELD",
      payload: { fieldName, value },
    });
  }, []);

  // Set a document file
  const setDocument = useCallback((documentType, file) => {
    dispatch({
      type: "SET_DOCUMENT",
      payload: { documentType, file },
    });
  }, []);

  // Upload a document to the server (keeps optimistic UI)
  // const uploadDocument = useCallback(
  //   async (documentType, file, { onProgress } = {}) => {
  //     // Optimistic: set the selected file so UI shows a preview/name
  //     dispatch({ type: "SET_DOCUMENT", payload: { documentType, file } });

  //     try {
  //       const uploaded = await uploadDocumentApi(documentType, file, (pct) => {
  //         // dispatch progress
  //         dispatch({
  //           type: "SET_UPLOAD_PROGRESS",
  //           payload: { documentType, progress: pct },
  //         });
  //         if (onProgress) onProgress(pct);
  //       });

  //       // store server metadata (id/url) separately
  //       dispatch({
  //         type: "SET_DOCUMENT_META",
  //         payload: { documentType, meta: uploaded },
  //       });

  //       // keep the original File in state.data.documents for final FormData submit
  //       return uploaded;
  //     } catch (err) {
  //       // set error and rethrow
  //       dispatch({
  //         type: "SET_ERROR",
  //         payload: { fieldName: documentType, error: "Upload failed" },
  //       });
  //       throw err;
  //     }
  //   },
  //   [],
  // );
  const uploadDocument = useCallback(
    async (documentType, file, { onProgress } = {}) => {
      // Optimistic UI: show the file immediately
      dispatch({ type: "SET_DOCUMENT", payload: { documentType, file } });

      // Prepare payload for init API
      const payload = {
        application_id: "YOUR_APP_ID", // replace dynamically
        document_type: documentType,
        filename: file.name,
        mime_type: file.type,
      };

      try {
        const uploaded = await uploadDocumentApi(payload, file, (pct) => {
          dispatch({
            type: "SET_UPLOAD_PROGRESS",
            payload: { documentType, progress: pct },
          });
          if (onProgress) onProgress(pct);
        });

        // store server metadata separately
        dispatch({
          type: "SET_DOCUMENT_META",
          payload: { documentType, meta: uploaded },
        });

        return uploaded;
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          payload: { fieldName: documentType, error: "Upload failed" },
        });
        throw err;
      }
    },
    [dispatch],
  );

  // Set field error
  const setError = useCallback((fieldName, error) => {
    dispatch({
      type: "SET_ERROR",
      payload: { fieldName, error },
    });
  }, []);

  // Navigate to next step
  const nextStep = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  // Navigate to previous step
  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  // Jump directly to a specific step (used by Review page)
  const goToStep = useCallback((step) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  // Reset form to initial state
  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  /**
   * Get dynamic country-specific fields configuration
   * Returns empty object if country not selected
   */
  const countrySpecificFieldsConfig = useMemo(() => {
    if (!state.data.country) return {};
    const countryConfig = COUNTRIES[state.data.country];
    return countryConfig?.fields || {};
  }, [state.data.country]);

  /**
   * Get dynamic business-type-specific fields configuration
   * Returns empty object if business type not selected
   */
  const businessTypeSpecificFieldsConfig = useMemo(() => {
    if (!state.data.businessType) return {};
    const businessTypeConfig = Object.values(BUSINESS_TYPES).find(
      (type) => type.id === state.data.businessType,
    );
    return businessTypeConfig?.fields || {};
  }, [state.data.businessType]);

  /**
   * Validate current step and return validation result
   * @returns {boolean} - True if all fields in current step are valid
   * NOTE: Validation is commented out for mock mode - uncomment for production
   */
  const validateCurrentStep = useCallback(() => {
    // TODO: Uncomment for production validation
    // Mock mode: always return true to allow navigation without validation
    return true;

    /* COMMENTED OUT FOR MOCK MODE
    const stepFieldsMap = {
      0: ["country", "businessType"],
      1: [
        "companyName",
        "registrationNumber",
        // "country",
        // "businessType",
        "email",
        "phone",
      ],
      2: ["bankAccountNumber", "swift", "currency", "annualRevenue", "taxId"],
      3: ["documents"],
      4: [],
    };

    const fieldsToValidate = stepFieldsMap[state.currentStep] || [];
    let isValid = true;

    fieldsToValidate.forEach((fieldName) => {
      if (fieldName === "documents") {
        // Validate documents
        const docs = state.data.documents;
        if (!docs.kycDocument) {
          setError("kycDocument", "KYC document is required");
          isValid = false;
        }
        if (!docs.businessLicense) {
          setError("businessLicense", "Business license is required");
          isValid = false;
        }
        if (!docs.proofOfAddress) {
          setError("proofOfAddress", "Proof of address is required");
          isValid = false;
        }
      } else if (state.data.country && fieldName === "country") {
        // Validate all country-specific fields
        const countryConfig = COUNTRIES[state.data.country];
        if (countryConfig?.fields) {
          Object.entries(countryConfig.fields).forEach(([cfName, cfConfig]) => {
            const cfValue = state.data.countrySpecificFields[cfName];
            if (cfConfig.required && (!cfValue || cfValue.trim() === "")) {
              setError(cfName, `${cfConfig.label} is required`);
              isValid = false;
            } else if (cfValue && !cfConfig.validation(cfValue)) {
              setError(cfName, cfConfig.error);
              isValid = false;
            }
          });
        }
      } else if (state.data.businessType && fieldName === "businessType") {
        // Validate all business-type-specific fields
        const businessTypeConfig = Object.values(BUSINESS_TYPES).find(
          (type) => type.id === state.data.businessType,
        );
        if (businessTypeConfig?.fields) {
          Object.entries(businessTypeConfig.fields).forEach(
            ([btName, btConfig]) => {
              const btValue = state.data.businessTypeSpecificFields[btName];
              if (btConfig.required && (!btValue || btValue.trim() === "")) {
                setError(btName, `${btConfig.label} is required`);
                isValid = false;
              } else if (btValue && !btConfig.validation(btValue)) {
                setError(btName, btConfig.error);
                isValid = false;
              }
            },
          );
        }
      } else {
        // Validate standard fields
        const value = state.data[fieldName];
        const validation = validateField(fieldName, value, true);
        if (!validation.isValid) {
          setError(fieldName, validation.error);
          isValid = false;
        }
      }
    });

    return isValid;
    */
  }, [state.currentStep, state.data, setError]);

  return {
    state,
    setField,
    setCountrySpecificField,
    setBusinessTypeField,
    setDocument,
    uploadDocument,
    setError,
    nextStep,
    prevStep,
    goToStep,
    reset,
    validateCurrentStep,
    countrySpecificFieldsConfig,
    businessTypeSpecificFieldsConfig,
  };
};

/**
 * SMEApplicationForm Index File
 * Exports all necessary components and utilities
 */

export { default as SMEApplicationForm } from "./SMEApplicationForm";
export { useSMEApplicationForm } from "./hooks/useSMEApplicationForm";
export { COUNTRIES, getCountryConfig } from "./config/countriesConfig";
export {
  BUSINESS_TYPES,
  getBusinessTypeConfig,
} from "./config/businessTypesConfig";
export {
  VALIDATION_RULES,
  validateField,
  validateFile,
} from "./config/validationRules";

// Sub-components for advanced usage
export { default as FormStepper } from "./components/FormStepper";
export { default as FormFieldGroup } from "./components/FormFieldGroup";
export { default as FileUploadField } from "./components/FileUploadField";

// Step components for advanced usage
export { default as Step1BasicInformation } from "./steps/Step1BasicInformation";
export { default as Step2FinancialDetails } from "./steps/Step2FinancialDetails";
export { default as Step3ComplianceDocumentation } from "./steps/Step3ComplianceDocumentation";
export { default as Step4ReviewSubmit } from "./steps/Step4ReviewSubmit";

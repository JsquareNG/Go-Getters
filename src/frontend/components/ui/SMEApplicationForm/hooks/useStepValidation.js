import { useMemo } from "react";
import { getCountryConfig } from "../config/countriesConfig";
import { getBusinessTypeConfig } from "../config/businessTypesConfig";

/**
 * Custom hook to validate each step and check if all fields are filled
 * Returns an object with validation status for each step
 */
export const useStepValidation = (data, documents = {}) => {
  const stepValidation = useMemo(() => {
    // Step 0: Country and Business Type
    const step0Valid =
      data.country &&
      data.country.trim() !== "" &&
      data.businessType &&
      data.businessType.trim() !== "";

    // Step 1: Basic Information
    const step1Valid =
      data.companyName &&
      data.companyName.trim() !== "" &&
      data.registrationNumber &&
      data.registrationNumber.trim() !== "" &&
      data.email &&
      data.email.trim() !== "" &&
      data.phone &&
      data.phone.trim() !== "" &&
      data.businessDescription &&
      data.businessDescription.trim() !== "" &&
      data.foundedYear &&
      String(data.foundedYear).trim() !== "" &&
      data.numberOfEmployees &&
      String(data.numberOfEmployees).trim() !== "" &&
      validateCountrySpecificFields(data) &&
      validateBusinessTypeSpecificFields(data);

    // Step 2: Financial Details
    const step2Valid =
      data.bankAccountNumber &&
      data.bankAccountNumber.trim() !== "" &&
      data.swift &&
      data.swift.trim() !== "" &&
      data.currency &&
      data.currency.trim() !== "" &&
      data.annualRevenue &&
      String(data.annualRevenue).trim() !== "" &&
      data.expectedMonthlyTransactionVolume &&
      String(data.expectedMonthlyTransactionVolume).trim() !== "";

    // Step 3: Compliance Documents
    const requiredDocKeys = getRequiredDocumentKeys(data);
    const step3Valid =
      requiredDocKeys.length > 0 &&
      requiredDocKeys.every(
        (docKey) => documents[docKey] && documents[docKey].name,
      );

    // Step 4: Review - no fields to validate, it's just review
    // It's valid as long as previous steps are valid
    const step4Valid = true;

    return {
      0: step0Valid,
      1: step1Valid && step0Valid,
      2: step2Valid && step1Valid && step0Valid,
      3: step3Valid && step2Valid && step1Valid && step0Valid,
      4: step4Valid && step3Valid && step2Valid && step1Valid && step0Valid,
    };
  }, [data, documents]);

  return stepValidation;
};

/**
 * Helper: Check if all country-specific fields are filled
 */
function validateCountrySpecificFields(data) {
  if (!data.country) return true; // No country selected, skip
  const countryConfig = getCountryConfig(data.country);
  if (!countryConfig?.fields) return true; // No country-specific fields required

  return Object.keys(countryConfig.fields).every((fieldName) => {
    const value = data.countrySpecificFields?.[fieldName];
    return value && String(value).trim() !== "";
  });
}

/**
 * Helper: Check if all business-type-specific fields are filled
 */
function validateBusinessTypeSpecificFields(data) {
  if (!data.businessType) return true; // No business type selected, skip
  const bizConfig = getBusinessTypeConfig(data.businessType);
  if (!bizConfig?.fields) return true; // No business-type-specific fields required

  return Object.keys(bizConfig.fields).every((fieldName) => {
    const value = data.businessTypeSpecificFields?.[fieldName];
    return value && String(value).trim() !== "";
  });
}

/**
 * Helper: Get required document keys based on country and business type
 */
function getRequiredDocumentKeys(data) {
  const countryDocs = getCountryConfig(data.country)?.documents || {};
  const bizDocs = getBusinessTypeConfig(data.businessType)?.documents || {};
  return Object.keys({ ...countryDocs, ...bizDocs });
}

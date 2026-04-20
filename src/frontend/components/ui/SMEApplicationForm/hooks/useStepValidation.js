import { useMemo } from "react";

export function useStepValidation(data = {}, documents = {}) {
  return useMemo(() => {

    const step0Valid = !!data.country?.trim() && !!data.businessType?.trim();

    const step1Valid =
      step0Valid &&
      !!data.companyName?.trim() &&
      !!data.registrationNumber?.trim() &&
      !!data.email?.trim() &&
      !!data.phone?.trim() &&
      !!data.businessDescription?.trim() &&
      !!String(data.foundedYear)?.trim() &&
      !!String(data.numberOfEmployees)?.trim() &&
      validateCountrySpecificFields(data) &&
      validateBusinessTypeSpecificFields(data);

    const step2Valid =
      step0Valid &&
      !!data.bankAccountNumber?.trim() &&
      !!data.swift?.trim() &&
      !!data.currency?.trim() &&
      !!String(data.annualRevenue)?.trim() &&
      !!String(data.expectedMonthlyTransactionVolume)?.trim();

    const requiredDocKeys = getRequiredDocumentKeys(data);
    const step3Valid =
      step0Valid &&
      requiredDocKeys.length > 0 &&
      requiredDocKeys.every((docKey) => documents[docKey]?.name);


    const step4Valid = step1Valid && step2Valid && step3Valid;

    return {
      0: step0Valid,
      1: step1Valid,
      2: step2Valid,
      3: step3Valid,
      4: step4Valid,
    };
  }, [data, documents]);
}


function validateCountrySpecificFields(data = {}) {
  if (!data.country) return false;
  const countryConfig = getCountryConfig(data.country);
  if (!countryConfig?.fields) return true;
  return Object.keys(countryConfig.fields).every((fieldName) => {
    const value = data.countrySpecificFields?.[fieldName];
    return value && String(value).trim() !== "";
  });
}

function validateBusinessTypeSpecificFields(data = {}) {
  if (!data.businessType) return false;
  const bizConfig = getBusinessTypeConfig(data.businessType);
  if (!bizConfig?.fields) return true;
  return Object.keys(bizConfig.fields).every((fieldName) => {
    const value = data.businessTypeSpecificFields?.[fieldName];
    return value && String(value).trim() !== "";
  });
}

function getRequiredDocumentKeys(data = {}) {
  const countryDocs = getCountryConfig(data.country)?.documents || {};
  const bizDocs = getBusinessTypeConfig(data.businessType)?.documents || {};
  return Object.keys({ ...countryDocs, ...bizDocs });
}
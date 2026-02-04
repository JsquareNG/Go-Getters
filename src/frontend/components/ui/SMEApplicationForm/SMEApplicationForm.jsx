import React, { useState } from "react";
import { Button } from "../button";
import { Card, CardContent } from "../card";
import { Loader } from "lucide-react";
import FormStepper from "./components/FormStepper";
import Step1BasicInformation from "./steps/Step1BasicInformation";
import Step2FinancialDetails from "./steps/Step2FinancialDetails";
import Step3ComplianceDocumentation from "./steps/Step3ComplianceDocumentation";
import Step4ReviewSubmit from "./steps/Step4ReviewSubmit";
import { useSMEApplicationForm } from "./hooks/useSMEApplicationForm";
import { useToast } from "../../../hooks/use-toast";

/**
 * SMEApplicationForm - Main Component
 *
 * A highly dynamic multi-step form for SMEs to apply for cross-border payments.
 * Features:
 * - Dynamic country-specific fields
 * - Dynamic business-type-specific fields
 * - Conditional field rendering and validation
 * - Form data persistence across steps
 * - Comprehensive file uploads with validation
 * - Beautiful UI with progress tracking
 *
 * Usage:
 * <SMEApplicationForm onSubmitSuccess={handleSuccess} />
 */
const SMEApplicationForm = ({
  onSubmitSuccess,
  apiEndpoint = "/api/sme/application",
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    state,
    setField,
    setCountrySpecificField,
    setBusinessTypeField,
    setDocument,
    setError,
    nextStep,
    prevStep,
    reset,
    validateCurrentStep,
    countrySpecificFieldsConfig,
    businessTypeSpecificFieldsConfig,
  } = useSMEApplicationForm();

  const STEP_LABELS = [
    "Basic Information",
    "Financial Details",
    "Compliance",
    "Review & Submit",
  ];

  // Handle document upload with error management
  const handleDocumentChange = (documentType, file, error = "") => {
    if (error) {
      setError(documentType, error);
      setDocument(documentType, null);
    } else {
      setDocument(documentType, file);
    }
  };

  // Proceed to next step after validation
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      nextStep();
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast({
        title: "Validation Error",
        description: "Please fix the errors above before proceeding.",
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast({
        title: "Validation Error",
        description: "Please review all information before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare form data for submission
      const formData = new FormData();

      // Add basic fields
      formData.append("companyName", state.data.companyName);
      formData.append("registrationNumber", state.data.registrationNumber);
      formData.append("country", state.data.country);
      formData.append("businessType", state.data.businessType);
      formData.append("email", state.data.email);
      formData.append("phone", state.data.phone);

      // Add country-specific fields
      Object.entries(state.data.countrySpecificFields).forEach(
        ([key, value]) => {
          formData.append(`countrySpecificFields[${key}]`, value);
        },
      );

      // Add business-type-specific fields
      Object.entries(state.data.businessTypeSpecificFields).forEach(
        ([key, value]) => {
          formData.append(`businessTypeSpecificFields[${key}]`, value);
        },
      );

      // Add financial details
      formData.append("bankAccountNumber", state.data.bankAccountNumber);
      formData.append("swift", state.data.swift);
      formData.append("currency", state.data.currency);
      formData.append("annualRevenue", state.data.annualRevenue);
      formData.append("taxId", state.data.taxId);

      // Add documents
      if (state.data.documents.kycDocument) {
        formData.append("kycDocument", state.data.documents.kycDocument);
      }
      if (state.data.documents.businessLicense) {
        formData.append(
          "businessLicense",
          state.data.documents.businessLicense,
        );
      }
      if (state.data.documents.proofOfAddress) {
        formData.append("proofOfAddress", state.data.documents.proofOfAddress);
      }

      // Submit to API
      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit application");
      }

      const result = await response.json();

      toast({
        title: "Success!",
        description:
          "Your application has been submitted successfully. We'll review it shortly.",
      });

      // Reset form
      reset();

      // Call success callback
      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Error",
        description:
          error.message ||
          "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            SME Cross-Border Payment Application
          </h1>
          <p className="text-gray-600 mt-2">
            Complete this form to enable cross-border payment capabilities
          </p>
        </div>

        {/* Stepper */}
        <FormStepper
          currentStep={state.currentStep}
          totalSteps={4}
          stepLabels={STEP_LABELS}
        />

        {/* Form Card */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: Basic Information */}
            {state.currentStep === 1 && (
              <Step1BasicInformation
                data={state.data}
                errors={state.errors}
                touched={state.touched}
                onFieldChange={setField}
                onCountrySpecificFieldChange={setCountrySpecificField}
                onBusinessTypeFieldChange={setBusinessTypeField}
                countrySpecificFieldsConfig={countrySpecificFieldsConfig}
                businessTypeSpecificFieldsConfig={
                  businessTypeSpecificFieldsConfig
                }
              />
            )}

            {/* Step 2: Financial Details */}
            {state.currentStep === 2 && (
              <Step2FinancialDetails
                data={state.data}
                errors={state.errors}
                touched={state.touched}
                onFieldChange={setField}
              />
            )}

            {/* Step 3: Compliance & Documentation */}
            {state.currentStep === 3 && (
              <Step3ComplianceDocumentation
                documents={state.data.documents}
                errors={state.errors}
                touched={state.touched}
                onDocumentChange={handleDocumentChange}
              />
            )}

            {/* Step 4: Review & Submit */}
            {state.currentStep === 4 && (
              <Step4ReviewSubmit
                data={state.data}
                onEdit={(step) => {
                  // Set current step and scroll to top
                  if (step === 1) {
                    state.currentStep = 1;
                  } else if (step === 2) {
                    state.currentStep = 2;
                  } else if (step === 3) {
                    state.currentStep = 3;
                  }
                  // Navigate directly - use prevStep or nextStep as needed
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                isSubmitting={isSubmitting}
              />
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t">
              <Button
                onClick={prevStep}
                disabled={state.currentStep === 1 || isSubmitting}
                variant="outline"
              >
                ← Previous
              </Button>

              {state.currentStep < 4 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Next →
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              )}
            </div>

            {/* Form Progress Info */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Step {state.currentStep} of 4
            </p>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need help?{" "}
            <a
              href="mailto:support@example.com"
              className="text-red-500 hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SMEApplicationForm;

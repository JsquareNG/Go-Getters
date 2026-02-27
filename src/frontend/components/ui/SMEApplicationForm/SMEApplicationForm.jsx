import React, { useState } from "react";
import { Button } from "../primitives/Button";
import { Card, CardContent } from "../primitives/Card";
import { Loader } from "lucide-react";
import FormStepper from "./components/FormStepper";
import Step0Brief from "./steps/Step0Brief";
import Step1BasicInformation from "./steps/Step1BasicInformation";
import Step2FinancialDetails from "./steps/Step2FinancialDetails";
import Step3ComplianceDocumentation from "./steps/Step3ComplianceDocumentation";
import Step4ReviewSubmit from "./steps/Step4ReviewSubmit";
import { useSMEApplicationForm } from "./hooks/useSMEApplicationForm";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

import { useSelector } from "react-redux";
import { selectUser } from "@/store/authSlice";
import { submitApplicationApi } from "@/api/applicationApi";
import { uploadDocument as uploadDocumentApi } from "@/api/documentApi";
import { getCountryConfig } from "./config/countriesConfig";
import { getBusinessTypeConfig } from "./config/businessTypesConfig";

/**
 * SMEApplicationForm - Main Component
 */
const SMEApplicationForm = ({ onSubmitSuccess }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useSelector(selectUser);

  const {
    state,
    setField,
    setCountrySpecificField,
    setBusinessTypeField,
    setDocument,
    setError,
    nextStep,
    prevStep,
    goToStep,
    // reset,
    // validateCurrentStep,
    countrySpecificFieldsConfig,
    businessTypeSpecificFieldsConfig,
  } = useSMEApplicationForm();

  const STEP_LABELS = [
    "To Get Started",
    "Basic Information",
    "Financial Details",
    "Compliance",
    "Review & Submit",
  ];

  // Store docs locally in state (no upload call here)
  const handleDocumentChange = async (documentType, file, error = "") => {
    if (error) {
      setError(documentType, error);
      setDocument(documentType, null);
      return;
    }

    setError(documentType, "");
    setDocument(documentType, file);
  };

  // Next step (mock mode: skip validation)
  const handleNextStep = () => {
    nextStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      toast({
        title: "Draft Saved",
        description: "Your application draft has been saved successfully.",
      });
    } catch (error) {
      console.error("Draft save error:", error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRequiredDocKeys = (data) => {
    const countryDocs = getCountryConfig(data.country)?.documents || {};
    const bizDocs = getBusinessTypeConfig(data.businessType)?.documents || {};
    return Object.keys({ ...countryDocs, ...bizDocs });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1) Create application
      const response = await submitApplicationApi({
        business_country: state.data.country,
        business_name: state.data.companyName,
        user_id: user.user_id,
        business_type: state.data.businessType,
        email: user.email,
        firstName: user.firstName,
      });

      const applicationId =
        response?.application_id || response?.data?.application_id;

      if (!applicationId) {
        throw new Error("No application_id returned from submitApplicationApi");
      }

      // 2) Validate required docs exist in local state
      const requiredDocKeys = getRequiredDocKeys(state.data);

      // Validate missing docs before uploading
      // for (const docKey of requiredDocKeys) {
      //   const f = state.data.documents?.[docKey];
      //   if (!f) {
      //     throw new Error(`Missing required document: ${docKey}`);
      //   }
      // }

      // 3) Upload documents sequentially
      for (const docKey of requiredDocKeys) {
        const file = state.data.documents[docKey];
        if (!file) continue;

        await uploadDocumentApi({
          applicationId,
          documentType: docKey,
          file,
          onProgress: (pct) => {
            // optional: wire progress into state if your hook supports it
          },
        });
      }

      toast({
        title: "Success!",
        description:
          "Your application has been submitted successfully. We'll review it shortly.",
      });

      navigate("/landingpage");

      if (onSubmitSuccess) {
        onSubmitSuccess(response);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Error",
        description:
          error?.message ||
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
          totalSteps={5}
          stepLabels={STEP_LABELS}
        />

        {/* Form Card */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-8">
            {/* Step 0: To Get Started */}
            {state.currentStep === 0 && (
              <Step0Brief
                data={state.data}
                errors={state.errors}
                touched={state.touched}
                onFieldChange={setField}
              />
            )}

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
                data={state.data}
                documents={state.data.documents}
                errors={state.errors}
                touched={state.touched}
                onDocumentChange={handleDocumentChange}
                documentsProgress={state.data.documentsProgress}
              />
            )}

            {/* Step 4: Review & Submit */}
            {state.currentStep === 4 && (
              <Step4ReviewSubmit
                data={state.data}
                onEdit={(step) => {
                  goToStep(step);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t">
              <Button
                onClick={prevStep}
                disabled={state.currentStep === 0 || isSubmitting}
                variant="outline"
              >
                ← Previous
              </Button>

              <div className="flex gap-3">
                {/* Save Draft Button - visible on all steps except submit */}
                {state.currentStep < 4 && (
                  <Button
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                    variant="outline"
                    className="border-gray-400 text-gray-700 hover:bg-gray-100"
                  >
                    💾 Save Draft
                  </Button>
                )}

                {/* Next Button - visible on steps 0-3 */}
                {state.currentStep < 4 ? (
                  <Button
                    onClick={handleNextStep}
                    disabled={isSubmitting}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Next →
                  </Button>
                ) : (
                  /* Submit Button - visible on step 4 (Review) */
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
            </div>

            {/* Form Progress Info */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Step {state.currentStep + 1} of 5
            </p>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need help?{" "}
            <a
              href="mailto:gogetters.support@example.com"
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
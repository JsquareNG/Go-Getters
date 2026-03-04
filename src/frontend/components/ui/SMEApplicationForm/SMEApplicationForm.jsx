import React, { useState, useEffect } from "react";
import { Button } from "../primitives/Button";
import { Card, CardContent } from "../primitives/Card";
import { Loader, ChevronLeft } from "lucide-react";
import FormStepper from "./components/FormStepper";
import ReadOnlyFormWrapper from "./components/ReadOnlyFormWrapper";
import Step0Brief from "./steps/Step0Brief";
import Step1BasicInformation from "./steps/Step1BasicInformation";
import Step2FinancialDetails from "./steps/Step2FinancialDetails";
import Step3ComplianceDocumentation from "./steps/Step3ComplianceDocumentation";
import Step4ReviewSubmit from "./steps/Step4ReviewSubmit";
import { useSMEApplicationForm } from "./hooks/useSMEApplicationForm";
import { useStepValidation } from "./hooks/useStepValidation";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "@/store/authSlice";
import {
  selectCurrentApplication,
  selectCurrentMode,
  selectCurrentStep,
  setCurrentStep,
  saveDraft as saveDraftAction,
  markAsSubmitted,
  setMode,
} from "@/store/applicationFormSlice";
import {
  submitApplicationApi,
  saveApplicationDraftApi,
} from "@/api/applicationApi";
import { uploadDocument as uploadDocumentApi } from "@/api/documentApi";
import { getCountryConfig } from "./config/countriesConfig";
import { getBusinessTypeConfig } from "./config/businessTypesConfig";

/**
 * SMEApplicationForm - Enhanced with Redux, draft management, step routing, and view-only mode
 *
 * Route: /application/(edit|view)/:appId/:step
 * - appId: application ID or 'new' for new applications
 * - step: 0-4 (current step)
 * Mode is determined by the route path segment (edit or view)
 */
const SMEApplicationForm = ({ onSubmitSuccess }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useSelector(selectUser);
  const currentApp = useSelector(selectCurrentApplication);
  const currentMode = useSelector(selectCurrentMode);
  const currentStepFromRedux = useSelector(selectCurrentStep);

  // Route params: appId, step
  const { appId, step: routeStep } = useParams();
  const location = window.location.pathname;
  const routeMode = location.includes("/application/view/") ? "view" : "edit";

  const parsedStep = Number.isNaN(parseInt(routeStep, 10))
    ? 0
    : parseInt(routeStep, 10);
  const clampedStep = Math.max(0, Math.min(4, parsedStep));
  const isViewOnly = routeMode === "view" || currentMode === "view";
  const mode = routeMode;

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
    countrySpecificFieldsConfig,
    businessTypeSpecificFieldsConfig,
  } = useSMEApplicationForm();

  // Initialize: sync Redux state to hook state
  useEffect(() => {
    if (appId && appId !== "new") {
      // Load existing application/draft
      if (currentApp?.formData) {
        // populate hook state from Redux
        Object.entries(currentApp.formData).forEach(([key, val]) => {
          if (
            key === "documents" ||
            key === "documentsProgress" ||
            key === "documentsMeta" ||
            key === "countrySpecificFields" ||
            key === "businessTypeSpecificFields"
          ) {
            return;
          }
          setField(key, val);
        });

        // Restore country-specific fields
        if (currentApp.formData.countrySpecificFields) {
          Object.entries(currentApp.formData.countrySpecificFields).forEach(
            ([k, v]) => {
              setCountrySpecificField(k, v);
            },
          );
        }

        // Restore business-specific fields
        if (currentApp.formData.businessTypeSpecificFields) {
          Object.entries(
            currentApp.formData.businessTypeSpecificFields,
          ).forEach(([k, v]) => {
            setBusinessTypeField(k, v);
          });
        }

        // Restore documents
        if (currentApp.formData.documents) {
          Object.entries(currentApp.formData.documents).forEach(([k, v]) => {
            setDocument(k, v);
          });
        }
      }
    }
  }, [appId, currentApp]);

  // Sync step from route to Redux and hook
  useEffect(() => {
    if (clampedStep !== currentStepFromRedux) {
      dispatch(setCurrentStep(clampedStep));
      goToStep(clampedStep);
    }
  }, [clampedStep, currentStepFromRedux, dispatch, goToStep]);

  // Redirect to step/0 if no step is present
  useEffect(() => {
    if (routeStep === undefined) {
      navigate(`/application/${mode}/${appId || "new"}/0`, { replace: true });
    }
  }, [routeStep, navigate, mode, appId]);

  // If waiting for redirect, show nothing
  if (routeStep === undefined) return null;

  const STEP_LABELS = [
    "To Get Started",
    "Basic Information",
    "Financial Details",
    "Compliance",
    "Review & Submit",
  ];

  // Validate each step based on filled fields
  const stepCompletion = useStepValidation(state.data, state.data.documents);

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
    const next = Math.min(4, clampedStep + 1);
    navigate(`/application/${mode}/${appId || "new"}/${next}`);
  };

  const handlePrevStep = () => {
    const prev = Math.max(0, clampedStep - 1);
    navigate(`/application/${mode}/${appId || "new"}/${prev}`);
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);

    try {
      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        form_data: {
          country: state.data.country,
          businessType: state.data.businessType,
          companyName: state.data.companyName,
          registrationNumber: state.data.registrationNumber,
          email: state.data.email,
          phone: state.data.phone,
          bankAccountNumber: state.data.bankAccountNumber,
          swift: state.data.swift,
          currency: state.data.currency,
          annualRevenue: state.data.annualRevenue,
          taxId: state.data.taxId,
          documents: state.data.documents,
          documentsProgress: state.data.documentsProgress,
          documentsMeta: state.data.documentsMeta,
          countrySpecificFields: state.data.countrySpecificFields,
          businessTypeSpecificFields: state.data.businessTypeSpecificFields,
        },
        ...(appId && appId !== "new" && { application_id: appId }),
      };

      const response = await saveApplicationDraftApi(payload);
      const newAppId =
        response?.application_id || response?.data?.application_id || appId;

      dispatch(saveDraftAction());

      toast({
        title: "Draft Saved",
        description: "Your application draft has been saved successfully.",
      });

      // Redirect to landingpage or back to form with new appId
      if (appId === "new" && newAppId) {
        navigate(`/application/edit/${newAppId}/${clampedStep}`, {
          replace: true,
        });
      } else {
        navigate("/landingpage");
      }
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
      // Step 1: Validate required fields
      if (!state.data.country || !state.data.businessType) {
        toast({
          title: "Validation Error",
          description: "Please complete all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Step 2: Upload documents if any are pending
      const documentsToUpload = Object.entries(state.data.documents || {})
        .filter(([_, doc]) => doc && !doc.uploadedAt)
        .map(([key, doc]) => ({ key, file: doc.file }));

      if (documentsToUpload.length > 0) {
        for (const { key, file } of documentsToUpload) {
          if (file) {
            await uploadDocumentApi({
              applicationId: appId,
              documentType: key,
              file,
              onProgress: (pct) => {
                // optional: wire progress into state if your hook supports it
              },
            });
          }
        }
      }

      // Step 3: Save final application payload
      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        form_data: {
          country: state.data.country,
          businessType: state.data.businessType,
          companyName: state.data.companyName,
          registrationNumber: state.data.registrationNumber,
          email: state.data.email,
          phone: state.data.phone,
          bankAccountNumber: state.data.bankAccountNumber,
          swift: state.data.swift,
          currency: state.data.currency,
          annualRevenue: state.data.annualRevenue,
          taxId: state.data.taxId,
          documents: state.data.documents,
          documentsProgress: state.data.documentsProgress,
          documentsMeta: state.data.documentsMeta,
          countrySpecificFields: state.data.countrySpecificFields,
          businessTypeSpecificFields: state.data.businessTypeSpecificFields,
        },
        status: "submitted",
        ...(appId && appId !== "new" && { application_id: appId }),
      };

      const response = await saveApplicationDraftApi(payload);
      const finalAppId =
        response?.application_id || response?.data?.application_id || appId;

      // Step 4: Update Redux state
      dispatch(markAsSubmitted({ applicationId: finalAppId }));
      dispatch(setMode("view"));

      // Step 5: Redirect to view mode
      navigate(`/application/view/${finalAppId}/0`, {
        replace: true,
      });

      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully.",
      });

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

  const getStepComponent = () => {
    const commonProps = {
      disabled: isViewOnly,
    };

    switch (clampedStep) {
      case 0:
        return (
          <Step0Brief
            data={state.data}
            errors={state.errors}
            touched={state.touched}
            onFieldChange={setField}
            {...commonProps}
          />
        );
      case 1:
        return (
          <Step1BasicInformation
            data={state.data}
            errors={state.errors}
            touched={state.touched}
            onFieldChange={setField}
            onCountrySpecificFieldChange={setCountrySpecificField}
            onBusinessTypeFieldChange={setBusinessTypeField}
            countrySpecificFieldsConfig={countrySpecificFieldsConfig}
            businessTypeSpecificFieldsConfig={businessTypeSpecificFieldsConfig}
            {...commonProps}
          />
        );
      case 2:
        return (
          <Step2FinancialDetails
            data={state.data}
            errors={state.errors}
            touched={state.touched}
            onFieldChange={setField}
            {...commonProps}
          />
        );
      case 3:
        return (
          <Step3ComplianceDocumentation
            data={state.data}
            documents={state.data.documents}
            errors={state.errors}
            touched={state.touched}
            onDocumentChange={handleDocumentChange}
            documentsProgress={state.data.documentsProgress}
            {...commonProps}
          />
        );
      case 4:
        return (
          <Step4ReviewSubmit
            data={state.data}
            onEdit={(step) => {
              navigate(`/application/${mode}/${appId || "new"}/${step}`, {
                replace: false,
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-gray-100 flex overflow-hidden">
      {/* DESKTOP SIDEBAR containing header + stepper */}
      <div className="hidden md:flex flex-col w-100 flex-shrink-0 sticky top-0 h-screen overflow-y-auto bg-white border-r">
        <div className="p-8">
          
          {/* Header with optional back button */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                SME Cross-Border Payment Application
              </h1>
              <p className="text-gray-600 mt-2">
                {isViewOnly
                  ? "View your submitted application"
                  : "Complete this form to enable cross-border payment capabilities"}
              </p>
            </div>

          </div>
          {/* Stepper inside sidebar */}
          <FormStepper
            currentStep={clampedStep}
            totalSteps={5}
            stepLabels={STEP_LABELS}
            stepCompletion={stepCompletion}
            disabled={isViewOnly}
          />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* mobile header + stepper */}
        <div className="md:hidden sticky top-0 z-20 bg-white border-b">
          <div className="py-8 px-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  SME Cross-Border Payment Application
                </h1>
                <p className="text-gray-600 mt-2">
                  {isViewOnly
                    ? "View your submitted application"
                    : "Complete this form to enable cross-border payment capabilities"}
                </p>
              </div>
            </div>
            <FormStepper
              currentStep={clampedStep}
              totalSteps={5}
              stepLabels={STEP_LABELS}
              stepCompletion={stepCompletion}
              disabled={isViewOnly}
            />
          </div>
        </div>

        {/* scrollable form content */}
        <div className="flex-1 overflow-y-auto justify-center items-center">
          <div className="max-w-5xl mx-auto py-8 px-4">
            {/* Form Card wrapped in ReadOnlyFormWrapper */}
            <ReadOnlyFormWrapper
              isReadOnly={isViewOnly}
              applicationStatus={currentApp?.status || "draft"}
            >
              <Card className="bg-white shadow-lg">
                <CardContent className="p-8">
                  {getStepComponent()}

                  {/* Navigation Buttons - Hidden if View Only */}
                  {!isViewOnly && (
                    <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t">
                      <Button
                        onClick={handlePrevStep}
                        disabled={clampedStep === 0 || isSubmitting}
                        variant="outline"
                      >
                        ← Previous
                      </Button>

                      <div className="flex gap-3">
                        {/* Save Draft Button - visible on all steps except submit */}
                        {clampedStep < 4 && (
                          <Button
                            onClick={handleSaveDraft}
                            disabled={isSubmitting}
                            variant="outline"
                            className="border-gray-400 text-gray-700 hover:bg-gray-100"
                          >
                            Save Draft
                          </Button>
                        )}

                        {/* Next Button - visible on steps 0-3 */}
                        {clampedStep < 4 ? (
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
                  )}
                </CardContent>
              </Card>
            </ReadOnlyFormWrapper>

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
      </div>
    </div>
  );
};

export default SMEApplicationForm;

import React, { useEffect, useState } from "react";
import { Button } from "../primitives/Button";
import { Card, CardContent } from "../primitives/Card";
import FormStepper from "./components/FormStepper";
import ReadOnlyFormWrapper from "./components/ReadOnlyFormWrapper";

import Step0Brief from "./steps/Step0Brief";
import Step1BasicInformation from "./steps/Step1BasicInformation";
import Step2FinancialDetails from "./steps/Step2FinancialDetails";
import Step3ComplianceDocumentation from "./steps/Step3ComplianceDocumentation";
import Step4ReviewSubmit from "./steps/Step4ReviewSubmit";

import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "@/store/authSlice";
import {
  selectCurrentApplication,
  selectCurrentMode,
  selectFormData,
  selectCurrentStep,
  setCurrentStep,
  saveDraft as saveDraftAction,
  submitApplication,
  updateField,
} from "@/store/applicationFormSlice";

import {
  submitApplicationApi,
  saveApplicationDraftApi,
} from "@/api/applicationApi";

const STEP_LABELS = [
  "To Get Started",
  "Basic Information",
  "Financial Details",
  "Compliance",
  "Review & Submit",
];

const SMEApplicationForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const formData = useSelector(selectFormData);
  const user = useSelector(selectUser);
  const currentApp = useSelector(selectCurrentApplication);
  const currentMode = useSelector(selectCurrentMode);
  const currentStepFromRedux = useSelector(selectCurrentStep);

  const { appId, step: routeStep } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const routeMode = window.location.pathname.includes("/application/view/")
    ? "view"
    : "edit";
  const clampedStep = Math.max(0, Math.min(4, Number(routeStep) || 0));
  const isViewOnly = routeMode === "view" || currentMode === "view";

  /* ------------------------------------------------ */
  /* REDUX FIELD UPDATE */
  /* ------------------------------------------------ */
  const handleFieldChange = (field, value) => {
    dispatch(updateField({ field, value }));
  };

  /* ------------------------------------------------ */
  /* SYNC ROUTE STEP -> REDUX STEP */
  /* ------------------------------------------------ */
  useEffect(() => {
    if (clampedStep !== currentStepFromRedux) {
      dispatch(setCurrentStep(clampedStep));
    }
  }, [clampedStep, currentStepFromRedux, dispatch]);

  /* ------------------------------------------------ */
  /* POPULATE PREVIOUS DRAFT */
  /* ------------------------------------------------ */
  // useEffect(() => {
  //   if (currentApp?.formData) {
  //     Object.entries(currentApp.formData).forEach(([key, value]) => {
  //       if (value !== undefined && value !== null) {
  //         handleFieldChange(key, value);
  //       }
  //     });
  //   }
  // }, [currentApp, formData]); // only run when currentApp loads

  useEffect(() => {
  if (currentApp?.formData && Object.keys(formData).length === 0) {
    Object.entries(currentApp.formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        handleFieldChange(key, value);
      }
    });
  }
}, [currentApp, formData]); // run only once

  /* ------------------------------------------------ */
  /* SAVE DRAFT */
  /* ------------------------------------------------ */
  const handleSaveDraft = async () => {
    try {
      // Map camelCase fields from store to snake_case for API
      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: formData.businessName || "",
        business_type: formData.businessType || "",
        business_country: formData.country || "",
        form_data: formData,
        last_saved_step: clampedStep,
        application_id: appId !== "new" ? appId : undefined,
      };

      console.log("Saving application draft payload:", payload); // debug log

      const res = await saveApplicationDraftApi(payload);

      dispatch(
        saveDraftAction({ appId: res.application_id || appId, data: formData }),
      );

      toast({
        title: "Draft Saved",
        description: "Your draft has been saved successfully.",
      });
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err?.message || "Failed to save draft.",
        variant: "destructive",
      });
    }
  };

  /* ------------------------------------------------ */
  /* SUBMIT APPLICATION */
  /* ------------------------------------------------ */
  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: formData.businessName || "",
        business_type: formData.businessType || "",
        business_country: formData.country || "",
        form_data: formData,
      };

      await submitApplicationApi(payload);

      dispatch(submitApplication({ appId, data: formData }));

      toast({
        title: "Application Submitted",
        description: "Your application has been submitted.",
      });
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: err?.message || "Failed to submit application.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------ */
  /* STEP COMPONENT SWITCH */
  /* ------------------------------------------------ */
  const getStepComponent = () => {
    const commonProps = {
      data: formData,
      onFieldChange: handleFieldChange,
      disabled: isViewOnly,
    };

    switch (clampedStep) {
      case 0:
        return <Step0Brief {...commonProps} />;
      case 1:
        return <Step1BasicInformation {...commonProps} />;
      case 2:
        return <Step2FinancialDetails {...commonProps} />;
      case 3:
        return (
          <Step3ComplianceDocumentation
            {...commonProps}
            documents={formData.documents}
            documentsProgress={formData.documentsProgress}
          />
        );
      case 4:
        return (
          <Step4ReviewSubmit
            {...commonProps}
            onSubmit={handleSubmitApplication}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  /* ------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------ */
  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-gray-50">
      <div className="hidden md:flex flex-col w-96 border-r bg-white">
        <div className="p-8">
          <h1 className="text-3xl font-bold">
            SME Cross-Border Payment Application
          </h1>
          <FormStepper
            currentStep={clampedStep}
            totalSteps={5}
            stepLabels={STEP_LABELS}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-8 px-4">
          <ReadOnlyFormWrapper
            isReadOnly={isViewOnly}
            applicationStatus={currentApp?.status || "draft"}
          >
            <Card className="bg-white shadow-lg">
              <CardContent className="p-8">
                {getStepComponent()}

                {!isViewOnly && (
                  <div className="mt-8 flex justify-between border-t pt-6">
                    <Button
                      onClick={() =>
                        navigate(
                          `/application/${routeMode}/${appId}/${clampedStep - 1}`,
                        )
                      }
                      disabled={clampedStep === 0}
                      variant="outline"
                    >
                      Previous
                    </Button>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleSaveDraft}>
                        Save Draft
                      </Button>

                      {clampedStep < 4 ? (
                        <Button
                          onClick={() =>
                            navigate(
                              `/application/${routeMode}/${appId}/${clampedStep + 1}`,
                            )
                          }
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSubmitApplication}
                          disabled={isSubmitting}
                        >
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </ReadOnlyFormWrapper>
        </div>
      </div>
    </div>
  );
};

export default SMEApplicationForm;
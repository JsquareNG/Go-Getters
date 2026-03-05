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

  const routeStepNumber = parseInt(routeStep, 10);
  const clampedStep = isNaN(routeStepNumber)
    ? 0
    : Math.max(0, Math.min(4, routeStepNumber));
  const isViewOnly =
    routeMode === "view" ||
    currentApp?.status ===
      "Submitted"; /* ------------------------------------------------ */

  console.log("Step props", { isViewOnly, formData });
  /* REDUX FIELD UPDATE */
  /* ------------------------------------------------ */

  // helper function to set nested value in formData based on field path (e.g. for document upload")
  // function setNestedValue(obj, path, value) {
  //   const keys = path.split(".");
  //   const lastKey = keys.pop();
  //   let curr = { ...obj };
  //   let ref = curr;

  //   for (const key of keys) {
  //     // create nested object if undefined
  //     ref[key] = ref[key] ? { ...ref[key] } : {};
  //     ref = ref[key];
  //   }

  //   ref[lastKey] = value;
  //   return curr;
  // }

  // In your parent:
  const handleFieldChange = (fieldPath, value) => {
    dispatch(updateField({ field: fieldPath, value })); // send fieldPath + value
    console.log("Field change dispatched:", { fieldPath, value });
  };

  // const handleFieldChange = (field, value) => {
  //   dispatch(updateField({ field, value }));
  // };

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
      const cleanData = {};

      function flatten(obj) {
        if (!obj || typeof obj !== "object") return;
        Object.entries(obj).forEach(([key, value]) => {
          if (key === "null") {
            // skip recursion into "null" objects
            return;
          } else if (value !== undefined && value !== null) {
            // preserve nested objects only if not arrays or File objects
            if (
              typeof value === "object" &&
              !Array.isArray(value) &&
              !(value instanceof File)
            ) {
              flatten(value);
            } else {
              cleanData[key] = value === "" ? null : value; // normalize empty string
            }
          }
        });
      }

      flatten(currentApp.formData);

      // remove top-level null key if exists
      if ("null" in cleanData) delete cleanData.null;

      // dispatch all cleaned fields
      Object.entries(cleanData).forEach(([key, value]) => {
        handleFieldChange(key, value);
      });

      console.log("Cleaned and flattened draft loaded:", cleanData);
    }
  }, [currentApp, formData]);

  /**
   * Validate SME application form data
   * Returns { isValid: boolean, errors: Record<string, string> }
   */
  // NOTE: CURRENTLY NOT IN USE
  const validateFormData = (data) => {
    const errors = {};

    // Required fields
    if (!data.businessName || data.businessName.trim() === "") {
      errors.businessName = "Business name is required";
    }
    if (!data.businessType || data.businessType.trim() === "") {
      errors.businessType = "Business type is required";
    }
    if (!data.country || data.country.trim() === "") {
      errors.country = "Country is required";
    }
    if (!data.email || data.email.trim() === "") {
      errors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(data.email)) {
      errors.email = "Email is invalid";
    }
    if (!data.phone || data.phone.trim() === "") {
      errors.phone = "Phone number is required";
    } else if (!/^\d{6,15}$/.test(data.phone)) {
      errors.phone = "Phone number must be 6-15 digits";
    }

    // Numeric fields
    if (data.expectedMonthlyTransactionVolume) {
      const value = Number(data.expectedMonthlyTransactionVolume);
      if (isNaN(value) || value < 0) {
        errors.expectedMonthlyTransactionVolume =
          "Expected monthly transaction volume must be a positive number";
      }
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  /* ------------------------------------------------ */
  /* SAVE DRAFT */
  /* ------------------------------------------------ */
  const handleSaveDraft = async () => {
    try {
      // Flatten formData before validating
      const cleanData = {};
      const flatten = (obj) => {
        if (!obj || typeof obj !== "object") return;
        Object.entries(obj).forEach(([key, value]) => {
          if (key === "null" || value === null || value === undefined) return;
          if (
            typeof value === "object" &&
            !Array.isArray(value) &&
            !(value instanceof File)
          ) {
            flatten(value);
          } else {
            cleanData[key] = value === "" ? null : value;
          }
        });
      };
      flatten(formData);

      // Validate
      // const { isValid, errors } = validateFormData(cleanData);
      // if (!isValid) {
      //   console.log("Validation errors:", errors);
      //   toast({
      //     title: "Cannot Save Draft",
      //     description:
      //       "Some fields have validation errors. Please check and fix them.",
      //     variant: "destructive",
      //   });
      //   return;
      // }

      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: cleanData.businessName || "",
        business_type: cleanData.businessType || "",
        business_country: cleanData.country || "",
        form_data: cleanData,
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
      const { isValid, errors } = validateFormData(formData);
      if (!isValid) {
        toast({
          title: "Cannot Submit",
          description: "Please fix validation errors before submitting.",
          variant: "destructive",
        });
        console.log("Submit validation errors:", errors);
        return;
      }

      await submitApplicationApi({
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: formData.businessName || "",
        business_type: formData.businessType || "",
        business_country: formData.country || "",
        form_data: formData,
      });

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

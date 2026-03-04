import React, { useState, useEffect } from "react";
import { Button } from "../primitives/Button";
import { Card, CardContent } from "../primitives/Card";
import { Loader } from "lucide-react";
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
import SINGAPORE_CONFIG from "./config/singaporeConfig";

const SMEApplicationForm = ({ onSubmitSuccess }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useSelector(selectUser);
  const currentApp = useSelector(selectCurrentApplication);
  const currentMode = useSelector(selectCurrentMode);
  const currentStepFromRedux = useSelector(selectCurrentStep);

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
    goToStep,
    countrySpecificFieldsConfig,
    businessTypeSpecificFieldsConfig,
  } = useSMEApplicationForm();

  useEffect(() => {
    if (appId && appId !== "new" && currentApp?.formData) {
      // populate hook state from Redux
      Object.entries(currentApp.formData).forEach(([key, val]) => {
        if (
          key === "documents" ||
          key === "documentsProgress" ||
          key === "documentsMeta" ||
          key === "countrySpecificFields" ||
          key === "businessTypeSpecificFields"
        )
          return;
        setField(key, val);
      });

      if (currentApp.formData.countrySpecificFields) {
        Object.entries(currentApp.formData.countrySpecificFields).forEach(
          ([k, v]) => setCountrySpecificField(k, v),
        );
      }
      if (currentApp.formData.businessTypeSpecificFields) {
        Object.entries(currentApp.formData.businessTypeSpecificFields).forEach(
          ([k, v]) => setBusinessTypeField(k, v),
        );
      }
      if (currentApp.formData.documents) {
        Object.entries(currentApp.formData.documents).forEach(([k, v]) =>
          setDocument(k, v),
        );
      }
    }
  }, [appId, currentApp]);

  useEffect(() => {
    if (clampedStep !== currentStepFromRedux) {
      dispatch(setCurrentStep(clampedStep));
      goToStep(clampedStep);
    }
  }, [clampedStep, currentStepFromRedux, dispatch, goToStep]);

  useEffect(() => {
    if (routeStep === undefined) {
      navigate(`/application/${mode}/${appId || "new"}/0`, { replace: true });
    }
  }, [routeStep, navigate, mode, appId]);

  if (routeStep === undefined) return null;

  const STEP_LABELS = [
    "To Get Started",
    "Basic Information",
    "Financial Details",
    "Compliance",
    "Review & Submit",
  ];

  const stepCompletion = useStepValidation(state.data, state.data.documents);

  // ------------------- NEW: Helper to check steps 0-3 ------------------- //
  const arePreviousStepsComplete = () => {
    const entityType = state.data.businessType;
    if (!entityType) return false;

    const entity = SINGAPORE_CONFIG.entities[entityType];
    if (!entity) return false;

    for (let i = 0; i < 3; i++) {
      const step = entity.steps[i];
      if (!step) continue;

      // main fields
      for (const [key, field] of Object.entries(step.fields || {})) {
        if (field.required) {
          const value = state.data[key];
          if (
            value === undefined ||
            value === null ||
            (typeof value === "string" && value.trim() === "")
          ) {
            return false;
          }
        }
      }

      // repeatable sections
      if (step.repeatableSections) {
        for (const sectionKey of Object.keys(step.repeatableSections)) {
          const section = step.repeatableSections[sectionKey];
          const entries = state.data[sectionKey] || [];
          if (entries.length < section.min) return false;

          for (const entry of entries) {
            for (const [fieldKey, field] of Object.entries(section.fields)) {
              if (field.required) {
                const val = entry[fieldKey];
                if (
                  val === undefined ||
                  val === null ||
                  (typeof val === "string" && val.trim() === "")
                ) {
                  return false;
                }
              }
            }
          }
        }
      }

      // documents
      if (step.documents?.length) {
        for (const docKey of step.documents) {
          if (!state.data.documents?.[docKey]?.file) return false;
        }
      }
    }

    return true;
  };
  // ---------------------------------------------------------------------- //

  const handleNextStep = () => {
    const next = clampedStep + 1;

    // Block Step 4 if previous steps incomplete
    if (next === 4 && !arePreviousStepsComplete()) {
      toast({
        title: "Complete All Steps",
        description:
          "Please fill in all required fields and upload all required documents in Steps 0–3 before reviewing and submitting.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/application/${mode}/${appId || "new"}/${Math.min(4, next)}`);
  };

  const handlePrevStep = () => {
    const prev = Math.max(0, clampedStep - 1);
    navigate(`/application/${mode}/${appId || "new"}/${prev}`);
  };

  const isStepLocked = (stepNum) => {
    if (stepNum === 0) return false;
    if (stepNum === 4) return !arePreviousStepsComplete();
    return !stepCompletion[stepNum - 1];
  };

  const handleDocumentChange = async (documentType, file, error = "") => {
    if (error) {
      setError(documentType, error);
      setDocument(documentType, null);
      return;
    }

    setError(documentType, "");
    setDocument(documentType, file);
  };

  //--- HELPER FUNCTION---
  const buildDynamicPayload = (stateData, countryCode = "SG", businessType) => {
  if (!businessType) return { form_data: stateData };

  const entityConfig = SINGAPORE_CONFIG.entities[businessType];
  if (!entityConfig) return { form_data: stateData };

  const payloadFormData = {};

  // Only include fields that have values for Steps 0-3
  entityConfig.steps?.forEach((step, stepIndex) => {
    if (stepIndex > 3) return;

    // --- Standard fields ---
    Object.keys(step.fields || {}).forEach((fieldKey) => {
      const value = stateData[fieldKey];
      if (value !== undefined && value !== "" && value !== null) {
        payloadFormData[fieldKey] = value;
      }

      // --- Conditional fields ---
      const field = step.fields[fieldKey];
      if (field?.conditionalFields && field.options) {
        const selectedOption = value;
        const conditionalFields = field.conditionalFields[selectedOption];
        if (conditionalFields) {
          Object.keys(conditionalFields).forEach((cKey) => {
            const cVal = stateData[cKey];
            if (cVal !== undefined && cVal !== "" && cVal !== null) {
              payloadFormData[cKey] = cVal;
            }
          });
        }
      }
    });

    // --- Repeatable sections ---
    if (step.repeatableSections) {
      Object.keys(step.repeatableSections).forEach((sectionKey) => {
        const entries = stateData[sectionKey] || [];
        const filteredEntries = entries
          .map((entry) => {
            const filtered = {};
            Object.keys(entry).forEach((k) => {
              const val = entry[k];
              if (val !== undefined && val !== "" && val !== null) {
                filtered[k] = val;
              }
            });
            return Object.keys(filtered).length ? filtered : null;
          })
          .filter(Boolean);
        if (filteredEntries.length) payloadFormData[sectionKey] = filteredEntries;
      });
    }

    // --- Documents ---
    if (step.documents?.length) {
      payloadFormData.documents = payloadFormData.documents || {};
      step.documents.forEach((docKey) => {
        const doc = stateData.documents?.[docKey];
        if (doc?.file) payloadFormData.documents[docKey] = doc;
      });
    }

    // --- Country-specific fields ---
    if (stateData.countrySpecificFields) {
      payloadFormData.countrySpecificFields = {
        ...stateData.countrySpecificFields,
      };
    }

    // --- Business-type fields ---
    if (stateData.businessTypeSpecificFields) {
      payloadFormData.businessTypeSpecificFields = {
        ...stateData.businessTypeSpecificFields,
      };
    }
  });

  return {
    business_country: countryCode,
    business_name: stateData.business_name || "",
    business_type: businessType,
    last_saved_step: stateData.last_saved_step ?? 0,
    previous_status: stateData.previous_status ?? null,
    current_status: stateData.current_status ?? "Draft",
    form_data: payloadFormData, // only populated fields
  };
};

//   const buildDynamicPayload = (stateData, countryCode = "SG", businessType) => {
//   if (!businessType) return { form_data: stateData };

//   const entityConfig = SINGAPORE_CONFIG.entities[businessType];
//   if (!entityConfig) return { form_data: stateData };

//   const payloadFormData = {};

//   // Loop Steps 0-3 (required for draft)
//   entityConfig.steps?.forEach((step, stepIndex) => {
//     if (stepIndex > 3) return;

//     // --- Top-level fields ---
//     Object.keys(step.fields || {}).forEach((fieldKey) => {
//       const value = stateData[fieldKey];
//       if (value !== undefined && value !== "" && value !== null) {
//         payloadFormData[fieldKey] = value;
//       }

//       // Conditional fields based on selected option
//       const field = step.fields[fieldKey];
//       if (field?.conditionalFields && field.options) {
//         const selectedOption = value;
//         const conditionalFields = field.conditionalFields[selectedOption];
//         if (conditionalFields) {
//           Object.keys(conditionalFields).forEach((cKey) => {
//             const cVal = stateData[cKey];
//             if (cVal !== undefined && cVal !== "" && cVal !== null) {
//               payloadFormData[cKey] = cVal;
//             }
//           });
//         }
//       }
//     });

//     // --- Repeatable sections ---
//     if (step.repeatableSections) {
//       Object.keys(step.repeatableSections).forEach((sectionKey) => {
//         const entries = stateData[sectionKey] || [];
//         payloadFormData[sectionKey] = entries
//           .map((entry) => {
//             const filteredEntry = {};
//             Object.keys(entry).forEach((k) => {
//               const val = entry[k];
//               if (val !== undefined && val !== "" && val !== null) {
//                 filteredEntry[k] = val;
//               }
//             });
//             return Object.keys(filteredEntry).length ? filteredEntry : null;
//           })
//           .filter(Boolean);
//       });
//     }

//     // --- Documents ---
//     if (step.documents?.length) {
//       payloadFormData.documents = payloadFormData.documents || {};
//       step.documents.forEach((docKey) => {
//         const doc = stateData.documents?.[docKey];
//         if (doc) payloadFormData.documents[docKey] = doc;
//       });
//     }

//     // --- Country-specific fields ---
//     if (stateData.countrySpecificFields) {
//       payloadFormData.countrySpecificFields = {
//         ...stateData.countrySpecificFields,
//       };
//     }

//     // --- Business-type fields ---
//     if (stateData.businessTypeSpecificFields) {
//       payloadFormData.businessTypeSpecificFields = {
//         ...stateData.businessTypeSpecificFields,
//       };
//     }
//   });

//   return {
//     business_country: countryCode, //necessary for backend mapping
//     businessType,  //necessary for backend mapping
//     form_data: payloadFormData,
//   };
// };

  const handleSaveDraft = async () => {
  try {
    const dynamicPayload = buildDynamicPayload(
  state.data,
  "SG",
  state.data.businessType
);

const finalPayload = {
  user_id: user.user_id,
  email: user.email,
  firstName: user.firstName,
  last_saved_step: clampedStep,
  application_id: appId !== "new" ? appId : undefined,
  ...dynamicPayload, // includes business_country, business_type, business_name, form_data
};

    // const finalPayload = {
    //   user_id: user.id,
    //   email: user.email,
    //   firstName: user.firstName,
    //   ...payload,
    //   application_id: appId !== "new" ? appId : undefined, // undefined for first save
    // };
//     const finalPayload = {
//   user_id: user.id,
//   email: user.email,
//   firstName: user.firstName,
//   business_country: "SG",                    // backend expects this
//   business_name: state.data.business_name,   // map from form state
//   business_type: state.data.businessType,   // backend expects this
//   last_saved_step: clampedStep,             // current step saved
//   form_data: buildDynamicPayload(
//     state.data,
//     "SG",
//     state.data.businessType
//   ).form_data,                              // only form_data
//   application_id: appId !== "new" ? appId : undefined,
// };

    const res = await saveApplicationDraftApi(finalPayload);

    // Update Redux with returned appId (backend may return a new ID)
    dispatch(
      saveDraftAction({
        appId: res.application_id || appId,
        data: state.data,
      })
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

  const handleSubmitApplication = async () => {
  setIsSubmitting(true);
  try {
    const payload = buildDynamicPayload(
      state.data,
      "SG",
      state.data.businessType
    );

    const finalPayload = {
      user_id: user.id,
      email: user.email,
      firstName: user.firstName,
      ...payload,
      application_id: appId !== "new" ? appId : undefined,
    };

    await submitApplicationApi(finalPayload);

    dispatch(markAsSubmitted({ appId, data: state.data }));

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

  // ------------------- NEXT BUTTON DISABLE ------------------- //
  const isNextDisabled = clampedStep === 3 && !arePreviousStepsComplete();
  // ----------------------------------------------------------- //

  const getStepComponent = () => {
    const commonProps = { disabled: isViewOnly };

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
            onFieldChange={setField}
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
            onSubmit={() => {}}
            isSubmitting={isSubmitting}
            stepCompletion={stepCompletion}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-gray-100 flex overflow-hidden">
      <div className="hidden md:flex flex-col w-100 flex-shrink-0 sticky top-0 h-screen overflow-y-auto bg-white border-r">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900">
            SME Cross-Border Payment Application
          </h1>
          <p className="text-gray-600 mt-2">
            {isViewOnly
              ? "View your submitted application"
              : "Complete this form to enable cross-border payment capabilities"}
          </p>
          <FormStepper
            currentStep={clampedStep}
            totalSteps={5}
            stepLabels={STEP_LABELS}
            stepCompletion={stepCompletion}
            isStepLocked={isStepLocked}
            onStepClick={(step) => {
              if (isStepLocked(step)) {
                toast({
                  title: "Step Locked",
                  description:
                    step === 4
                      ? "Complete Steps 1-3 before accessing Review & Submit"
                      : "Complete previous steps first",
                  variant: "destructive",
                });
              } else {
                navigate(`/application/${mode}/${appId || "new"}/${step}`);
              }
            }}
            disabled={isViewOnly}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden sticky top-0 z-20 bg-white border-b">
          <div className="py-8 px-4">
            <h1 className="text-3xl font-bold text-gray-900">
              SME Cross-Border Payment Application
            </h1>
            <p className="text-gray-600 mt-2">
              {isViewOnly
                ? "View your submitted application"
                : "Complete this form to enable cross-border payment capabilities"}
            </p>
            <FormStepper
              currentStep={clampedStep}
              totalSteps={5}
              stepLabels={STEP_LABELS}
              stepCompletion={stepCompletion}
              isStepLocked={isStepLocked}
              disabled={isViewOnly}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto justify-center items-center">
          <div className="max-w-5xl mx-auto py-8 px-4">
            <ReadOnlyFormWrapper
              isReadOnly={isViewOnly}
              applicationStatus={currentApp?.status || "draft"}
            >
              <Card className="bg-white shadow-lg">
                <CardContent className="p-8">
                  {getStepComponent()}
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
                        {clampedStep < 4 ? (
                          <Button
                            onClick={handleNextStep}
                            disabled={isSubmitting || isNextDisabled}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Next →
                          </Button>
                        ) : (
                          <Button
                            onClick={handleSubmitApplication}
                            disabled={isSubmitting}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            {isSubmitting ? (
                              <>
                                {" "}
                                <Loader className="mr-2 h-4 w-4 animate-spin" />{" "}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMEApplicationForm;

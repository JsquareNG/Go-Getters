import React, { useEffect, useState, useCallback } from "react";
import { Button } from "../primitives/Button";
import { Card, CardContent } from "../primitives/Card";
import FormStepper from "./components/FormStepper";
import ReadOnlyFormWrapper from "./components/ReadOnlyFormWrapper";

import Step0Brief from "./steps/Step0Brief";
import Step1BasicInformation from "./steps/Step1BasicInformation";
import Step2FinancialDetails from "./steps/Step2FinancialDetails";
import Step3ComplianceDocumentation from "./steps/Step3ComplianceDocumentation";
import Step4 from "./steps/Step4";
import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "./config";

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
  loadApplication,
  resetForm,
  startNewApplication,
} from "@/store/applicationFormSlice";

import {
  // submitApplicationApi,
  submitSmeApplicationApi,
  secondSubmit,
  saveApplicationDraftApi,
  getApplicationByAppId,
} from "@/api/applicationApi";

import { uploadDocumentApi } from "@/api/documentApi";

const STEP_LABELS = [
  "To Get Started",
  "Basic Information",
  "Financial Details",
  "Documentation",
  "Review & Submit",
];

const SMEApplicationForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const formData = useSelector(selectFormData);
  const user = useSelector(selectUser);
  const currentApp = useSelector(selectCurrentApplication);
  // const currentMode = useSelector(selectCurrentMode);
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
  const isViewOnly = routeMode === "view" || currentApp?.status === "Submitted";

  const CONFIG_MAP = {
    SG: SINGAPORE_CONFIG,
    ID: INDONESIA_CONFIG,
  };
  const activeConfig = CONFIG_MAP[formData?.country] || SINGAPORE_CONFIG;

  // --- Edit functionality ---
  const handleEditStep = (step) => {
    navigate(`/application/edit/${appId}/${step}`);
  };

  /* ------------------------------------------------ */
  /* LOAD APPLICATION FROM API */
  /* ------------------------------------------------ */

  useEffect(() => {
    const initApplication = async () => {
      try {
        if (!appId || appId === "new") {
          dispatch(resetForm());
          dispatch(startNewApplication());
          return;
        }

        const app = await getApplicationByAppId(appId);

        dispatch(
          loadApplication({
            applicationId: app.application_id || app.id,
            formData: app?.form_data || {},
            status: app?.current_status || "Draft",
          }),
        );
      } catch (err) {
        console.error("Failed to load application", err);
        dispatch(resetForm());
        dispatch(startNewApplication());
      }
    };

    initApplication();
  }, [appId, dispatch]);

  /* ------------------------------------------------ */
  /* SYNC ROUTE STEP -> REDUX STEP */
  /* ------------------------------------------------ */
  useEffect(() => {
    if (clampedStep !== currentStepFromRedux) {
      dispatch(setCurrentStep(clampedStep));
    }
  }, [clampedStep, currentStepFromRedux, dispatch]);

  /* ------------------------------------------------ */
  /* REDUX FIELD UPDATE */
  /* ------------------------------------------------ */

  const handleFieldChange = useCallback(
    (fieldPath, value) => {
      if (!fieldPath) return;
      dispatch(updateField({ field: fieldPath, value }));
    },
    [dispatch],
  );

  /** -------------------------
   * Map repeatable sections or individuals dynamically
   * ------------------------- */
  const mapRepeatableData = (data, config) => {
    const mapped = {};
    if (!config?.steps) return mapped;

    config.steps.forEach((step) => {
      const repeatableSections = step.repeatableSections || {};
      Object.entries(repeatableSections).forEach(
        ([sectionKey, sectionConfig]) => {
          if (Array.isArray(data[sectionKey])) {
            mapped[sectionKey] = data[sectionKey].map((item) => {
              const obj = {};
              Object.entries(sectionConfig.fields).forEach(
                ([fKey, fConfig]) => {
                  obj[fKey] = item[fKey] ?? null;
                  if (fConfig.conditionalFields && item[fKey]) {
                    Object.entries(
                      fConfig.conditionalFields[item[fKey]] || {},
                    ).forEach(([ck, cd]) => {
                      obj[ck] = item[ck] ?? null;
                    });
                  }
                },
              );
              return obj;
            });
          }
        },
      );
    });

    return mapped;
  };

  /** -------------------------
   * Extract files recursively
   * ------------------------- */
  const extractFiles = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    if (obj instanceof File) return obj;
    if ("file" in obj && obj.file instanceof File) return obj.file;
    if (Array.isArray(obj)) return obj.map(extractFiles);

    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, extractFiles(v)]),
    );
  };

  // --------------------------
  // Build individuals dynamically based on selected business type
  // --------------------------
  const mapIndividualsDynamic = (data, activeConfig) => {
  const individuals = [];
  const businessType = data.businessType;

  if (!businessType || !activeConfig?.entities[businessType]) return individuals;

  const entityConfig = activeConfig.entities[businessType];

  // Gather all repeatable sections across steps
  const repeatableSections = {};
  entityConfig.steps.forEach((step) => {
    Object.assign(repeatableSections, step.repeatableSections || {});
  });

  // Step 1: Create a default individual from all fields in repeatable sections
  const defaultIndividual = {};

  Object.entries(repeatableSections).forEach(([sectionKey, sectionConfig]) => {
    Object.keys(sectionConfig.fields || {}).forEach((fKey) => {
      defaultIndividual[fKey] = data[fKey] ?? null;
    });
    defaultIndividual.role = sectionKey; // set role based on section
  });

  // Step 2: Add common top-level individual fields if they exist in config or standard
  const baseFields = ["fullName", "idNumber", "nationality", "residentialAddress", "dateOfBirth", "idDocument"];
  baseFields.forEach((key) => {
    if (!(key in defaultIndividual)) defaultIndividual[key] = data[key] ?? null;
  });

  individuals.push(defaultIndividual);

  // Step 3: Map actual repeatable arrays if they exist in data
  Object.entries(repeatableSections).forEach(([sectionKey, sectionConfig]) => {
    if (Array.isArray(data[sectionKey])) {
      data[sectionKey].forEach((item) => {
        const individual = {};
        Object.keys(sectionConfig.fields || {}).forEach((fKey) => {
          individual[fKey] = item[fKey] ?? null;

          // Handle conditional fields
          const fConfig = sectionConfig.fields[fKey];
          if (fConfig?.conditionalFields && item[fKey]) {
            Object.entries(fConfig.conditionalFields[item[fKey]] || {}).forEach(
              ([ck]) => (individual[ck] = item[ck] ?? null)
            );
          }
        });
        individual.role = sectionKey;
        individuals.push(individual);
      });
    }
  });

  return individuals;
};

  // --------------------------
  // Build payload for draft or submit
  // --------------------------
  const buildDynamicPayload = (formData, activeConfig) => {
    const normalizedData = { ...formData };

    // Flatten if form_data exists (avoid nested form_data loops)
    if (formData.form_data) {
      Object.assign(normalizedData, formData.form_data);
      delete normalizedData.form_data;
    }

    // Build individuals
    const individuals = mapIndividualsDynamic(normalizedData, activeConfig);

    // Build payload
    const payload = {
      ...normalizedData,
      business_type:
        normalizedData.businessType || normalizedData.business_type || null,
      business_country:
        normalizedData.country || normalizedData.business_country || null,
      individuals: individuals.map((ind) => extractFiles(ind)), // extract files if any
    };

    // Remove keys that are now under individuals
    const keysToRemove = [];
    individuals.forEach((ind) =>
      Object.keys(ind).forEach((k) => keysToRemove.push(k)),
    );
    keysToRemove.forEach((k) => delete payload[k]);

    return payload;
  };

  /** -------------------------
   * Check incomplete fields dynamically
   * ------------------------- */
  const hasIncompleteFields = (data) => {
    const businessType = data.businessType;
    if (!businessType) return true;

    const steps = activeConfig.entities[businessType]?.steps || [];
    let incomplete = false;

    steps.forEach((step) => {
      Object.entries(step.fields || {}).forEach(([key, fieldDef]) => {
        if (fieldDef.required && !data[key]) incomplete = true;

        // Conditional fields
        if (fieldDef.conditionalFields && data[key]) {
          Object.entries(fieldDef.conditionalFields[data[key]] || {}).forEach(
            ([ck, cd]) => {
              if (cd.required && !data[ck]) incomplete = true;
            },
          );
        }
      });

      const repeatableSections = step.repeatableSections || {};
      Object.values(repeatableSections).forEach((section) => {
        (data[section.key] || []).forEach((item) => {
          Object.entries(section.fields || {}).forEach(([k, fDef]) => {
            if (fDef.required && !item[k]) incomplete = true;
            if (fDef.conditionalFields && item[k]) {
              Object.entries(fDef.conditionalFields[item[k]] || {}).forEach(
                ([ck, cd]) => {
                  if (cd.required && !item[ck]) incomplete = true;
                },
              );
            }
          });
        });
      });
    });

    return incomplete;
  };

  // const hasNullFields = (data) => {
  //   const requiredFields = getRequiredFields(data);

  //   for (const field of requiredFields) {
  //     if (
  //       data[field] === null ||
  //       data[field] === undefined ||
  //       data[field] === ""
  //     ) {
  //       return true;
  //     }
  //   }

  //   // Check repeatable sections/individuals
  //   const individuals = mapIndividuals(data);
  //   const individualFields = Object.keys(individuals);
  //   for (const field of individualFields) {
  //     if (individuals[field] === null || individuals[field] === undefined) {
  //       return true;
  //     }
  //   }

  //   return false;
  // };

  // function mapRepeatableSection(sectionData, sectionConfig) {
  //   return sectionData.map((item) => {
  //     const mapped = {};
  //     Object.entries(sectionConfig.fields).forEach(([key, def]) => {
  //       if (item[key] !== undefined) mapped[key] = item[key];

  //       if (def.conditionalFields && item[key]) {
  //         Object.entries(def.conditionalFields[item[key]] || {}).forEach(
  //           ([ck, cd]) => {
  //             mapped[ck] = item[ck] ?? null;
  //           },
  //         );
  //       }
  //     });
  //     return mapped;
  //   });
  // }

  /**
   * Recursively traverses the formData object
   * Returns an array of all keys/paths where type === "file"
   * Also supports conditional and repeatable sections
   */
  // function extractFileFields(config, path = []) {
  //   let files = [];

  //   for (const key in config) {
  //     const field = config[key];

  //     if (!field) continue;

  //     // Standard file field
  //     if (field.type === "file") {
  //       files.push({ path: [...path, key], field });
  //     }

  //     // Conditional fields (e.g., UBO, conditionalFields)
  //     if (field.conditionalFields) {
  //       for (const condKey in field.conditionalFields) {
  //         files.push(
  //           ...extractFileFields(field.conditionalFields[condKey], [
  //             ...path,
  //             key,
  //             condKey,
  //           ]),
  //         );
  //       }
  //     }

  //     // Repeatable sections
  //     if (field.fields && typeof field.fields === "object") {
  //       files.push(...extractFileFields(field.fields, [...path, key]));
  //     }
  //   }

  //   return files;
  // }

  // const extractFiles = (obj) => {
  //   if (!obj || typeof obj !== "object") return obj;

  //   // If it's a File itself
  //   if (obj instanceof File) return obj;

  //   // If it's the { file, progress } structure
  //   if ("file" in obj && obj.file instanceof File) return obj.file;

  //   // Arrays: map recursively
  //   if (Array.isArray(obj)) return obj.map(extractFiles);

  //   // Objects: recurse
  //   const result = {};
  //   Object.entries(obj).forEach(([key, value]) => {
  //     result[key] = extractFiles(value);
  //   });

  //   return result;
  // };



  /* ------------------------------------------------ */
  /* SAVE DRAFT */
  /* ------------------------------------------------ */
  const handleSaveDraft = async () => {
    try {

      // Upload documents first
      const documents = formData.documents || {};
      for (const [docType, files] of Object.entries(documents)) {
        for (const file of files) {
          if (file instanceof File) {
            await uploadDocumentApi({
              applicationId: appId !== "new" ? appId : undefined,
              documentType: docType,
              file,
            });
          }
        }
      }

      // for (const [docType, files] of Object.entries(documents)) {
      //   for (const file of files) {
      //     if (file instanceof File) {
      //       await uploadDocumentApi({
      //         applicationId: appId !== "new" ? appId : undefined,
      //         documentType: docType,
      //         file,
      //         onProgress: (pct) =>
      //           console.log(`Uploading ${file.name}: ${pct}%`),
      //       });
      //     }
      //   }
      // }

      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: formData.businessName || "",
        business_type: formData.businessType || "",
        business_country: formData.country || "",
        form_data: buildDynamicPayload(formData, activeConfig),
        // form_data: buildPayload(formData), // <-- individuals included here
        last_saved_step: clampedStep,
        application_id: appId !== "new" ? appId : undefined,
      };

      // console.log("Saving application draft payload:", payload); // debug log

      const res = await saveApplicationDraftApi(payload);
      const savedAppId = res.application_id || appId;

      // Update Redux
      dispatch(saveDraftAction({ appId: savedAppId, data: formData }));

      // Update URL to reflect the actual application_id
      if (appId === "new" && savedAppId) {
        navigate(`/application/edit/${savedAppId}/${clampedStep}`, {
          replace: true,
        });
      }

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
   
      // Upload each document first
      // for (const doc of documents) {
      //   const fileArray = formData.documents[doc.document_type] || [];
      //   for (const file of fileArray) {
      //     await uploadDocumentApi({
      //       applicationId: appId,
      //       documentType: doc.document_type,
      //       file,
      //       onProgress: (pct) => {
      //         // optional: you can track progress here
      //         console.log(`Uploading ${doc.filename}: ${pct}%`);
      //       },
      //     });
      //   }
      // }

      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: formData.businessName || "",
        business_type: formData.businessType || "",
        business_country: formData.country || "",
        // form_data: buildPayload(formData),
        form_data: buildDynamicPayload(formData, activeConfig),

        last_saved_step: clampedStep,
        application_id: appId !== "new" ? appId : undefined,
      };

      // Conditional API call
      let returnedAppId = appId;
    
      await submitSmeApplicationApi({
        application_id: appId !== "new" ? appId : undefined,
        form_data: payload,
      });

      dispatch(submitApplication({ appId: returnedAppId, data: formData }));

      toast({
        title: "Application Submitted",
        description: "Your application has been submitted.",
      });

      navigate(`/landingpage`);
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
          <Step4
            {...commonProps}
            onSubmit={handleSubmitApplication}
            isSubmitting={isSubmitting}
            onEdit={handleEditStep}
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
      <div className="hidden md:flex flex-col items-center w-96 border-r bg-white">
        <div className="p-8">
          <h1 className="text-3xl font-bold md:pb-6">
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
                    {/* Previous Button */}
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
                      {/* Always show Save Draft */}
                      <Button
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={isSubmitting}
                      >
                        Save Draft
                      </Button>

                      {/* Next / Submit logic */}
                      {clampedStep < 4 ? (
                        // Show Next button if not last step
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
                        // Last step: show Submit only if all fields are filled
                        // !hasNullFields(formData) && (
                        !hasIncompleteFields(formData) && (
                          <Button
                            onClick={handleSubmitApplication}
                            // disabled={isSubmitting}
                            disabled={
                              isSubmitting || hasIncompleteFields(formData)
                            }
                            // variant="destructive"
                          >
                            Submit
                          </Button>
                        )
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

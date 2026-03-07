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
import Step4 from "./steps/Step4";
import SINGAPORE_CONFIG2 from "./config/updatedSingaporeConfig";

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

  // console.log("Step props", { isViewOnly, formData });
  // console.log("form data: ", formData);
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

  // const handleFieldChange = (fieldPath, value) => {
  //   if (!fieldPath) {
  //     console.error("Invalid fieldPath:", fieldPath);
  //     return;
  //   }

  //   dispatch(updateField({ fieldPath, value }));
  // };
  // const handleFieldChange = (field, value) => {
  //   if (!field) {
  //     console.error("Invalid field:", field);
  //     return;
  //   }

  //   dispatch(updateField({ field, value })); // <-- must be "field", not "fieldPath"
  // };
  const handleFieldChange = (fieldPath, value) => {
    if (!fieldPath) return;
    dispatch(updateField({ field: fieldPath, value }));
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

  useEffect(() => {
    if (currentApp?.formData && Object.keys(formData).length === 0) {
      const cleanData = {};

      // function flatten(obj) {
      //   if (!obj || typeof obj !== "object") return;
      //   Object.entries(obj).forEach(([key, value]) => {
      //     if (key === "null") {
      //       // skip recursion into "null" objects
      //       return;
      //     } else if (value !== undefined && value !== null) {
      //       // preserve nested objects only if not arrays or File objects
      //       if (
      //         typeof value === "object" &&
      //         !Array.isArray(value) &&
      //         !(value instanceof File)
      //       ) {
      //         flatten(value);
      //       } else {
      //         cleanData[key] = value === "" ? null : value; // normalize empty string
      //       }
      //     }
      //   });
      // }

      function flatten(obj) {
        if (!obj || typeof obj !== "object") return;
        Object.entries(obj).forEach(([key, value]) => {
          if (value instanceof File) {
            cleanData[key] = value; // keep File as is
          } else if (Array.isArray(value)) {
            // preserve arrays as arrays, do not flatten into indices
            cleanData[key] = value.map((v) =>
              typeof v === "object" ? { ...v } : v,
            );
          } else if (typeof value === "object" && value !== null) {
            flatten(value);
          } else {
            cleanData[key] = value === "" ? null : value;
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
  // console.log(formData);

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

  const getRequiredFields = (data) => {
    const businessType = data.businessType;
    if (!businessType) return [];

    const steps = SINGAPORE_CONFIG2.entities[businessType]?.steps || [];
    const requiredFields = [];

    steps.forEach((step) => {
      const fields = step.fields || {};
      Object.entries(fields).forEach(([key, fieldDef]) => {
        if (fieldDef.required) requiredFields.push(key);

        // Handle conditional fields
        if (fieldDef.conditionalFields && data[key]) {
          Object.entries(fieldDef.conditionalFields[data[key]] || {}).forEach(
            ([cKey, cDef]) => {
              if (cDef.required) requiredFields.push(cKey);
            },
          );
        }
      });

      // HELPERS **
      // Repeatable sections (like owners/partners)
      const repeatableSections = step.repeatableSections || {};
      Object.values(repeatableSections).forEach((section) => {
        Object.entries(section.fields || {}).forEach(([key, fieldDef]) => {
          if (fieldDef.required) requiredFields.push(key);

          // Handle conditional fields
          if (fieldDef.conditionalFields && data[key]) {
            Object.entries(fieldDef.conditionalFields[data[key]] || {}).forEach(
              ([cKey, cDef]) => {
                if (cDef.required) requiredFields.push(cKey);
              },
            );
          }
        });
      });
    });

    return requiredFields;
  };

  const hasNullFields = (data) => {
    const requiredFields = getRequiredFields(data);

    for (const field of requiredFields) {
      if (
        data[field] === null ||
        data[field] === undefined ||
        data[field] === ""
      ) {
        return true;
      }
    }

    // Check repeatable sections/individuals
    const individuals = mapIndividuals(data);
    const individualFields = Object.keys(individuals);
    for (const field of individualFields) {
      if (individuals[field] === null || individuals[field] === undefined) {
        return true;
      }
    }

    return false;
  };

  /**
   * Recursively traverses the formData object
   * Returns an array of all keys/paths where type === "file"
   * Also supports conditional and repeatable sections
   */
  function extractFileFields(config, path = []) {
    let files = [];

    for (const key in config) {
      const field = config[key];

      if (!field) continue;

      // Standard file field
      if (field.type === "file") {
        files.push({ path: [...path, key], field });
      }

      // Conditional fields (e.g., UBO, conditionalFields)
      if (field.conditionalFields) {
        for (const condKey in field.conditionalFields) {
          files.push(
            ...extractFileFields(field.conditionalFields[condKey], [
              ...path,
              key,
              condKey,
            ]),
          );
        }
      }

      // Repeatable sections
      if (field.fields && typeof field.fields === "object") {
        files.push(...extractFileFields(field.fields, [...path, key]));
      }
    }

    return files;
  }

  const extractFiles = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    // If it's a File itself
    if (obj instanceof File) return obj;

    // If it's the { file, progress } structure
    if ("file" in obj && obj.file instanceof File) return obj.file;

    // Arrays: map recursively
    if (Array.isArray(obj)) return obj.map(extractFiles);

    // Objects: recurse
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      result[key] = extractFiles(value);
    });

    return result;
  };

  const mapIndividuals = (data) => {
    const individual = {
      fullName: data.fullName || null,
      idNumber: data.idNumber || null,
      nationality: data.nationality || null,
      residentialAddress: data.residentialAddress || null,
      dateOfBirth: data.dateOfBirth || null,
      idDocument: data.idDocument || null,
      role: "Owner",
      ownership: "100%",
    };

    // List of declarations
    const declarations = [
      "pepDeclaration",
      "sanctionsDeclaration",
      "fatcaDeclaration",
    ];

    declarations.forEach((decl) => {
      if (data[decl]) {
        individual[decl] = data[decl]; // store the user's input ("Yes" or "No")

        // Only store actual values from conditional fields if user said "Yes"
        const configFields =
          SINGAPORE_CONFIG2.entities.sole_proprietorship.steps[0]
            .repeatableSections.owners.fields[decl]?.conditionalFields;

        if (configFields?.[data[decl]]) {
          // Only copy the **values**, not the field definitions
          Object.keys(configFields[data[decl]]).forEach((key) => {
            // Use value from data if exists, else null
            individual[key] = data[key] ?? null;
          });
        }
      }
    });

    return individual;
  };
  // const mapIndividuals = (data) => {
  //   const individuals = [];

  //   switch (data.businessType) {
  //     case "sole_proprietorship":
  //       ina
  //     case "general_partnership":
  //       (data.partners || []).forEach((p) => {
  //         individuals.push({
  //           ...p,
  //           role: "Partner",
  //           ownership: p.ownership || null,
  //         });
  //       });
  //       break;

  //     case "limited_partnership":
  //       (data.generalPartners || []).forEach((gp) => {
  //         individuals.push({
  //           ...gp,
  //           role: "General Partner",
  //           ownership: gp.ownership || null,
  //         });
  //       });
  //       (data.limitedPartners || []).forEach((lp) => {
  //         individuals.push({
  //           ...lp,
  //           role: "Limited Partner",
  //           ownership: lp.ownership || null,
  //         });
  //       });
  //       break;

  //     case "llp":
  //       (data.partners || []).forEach((p) => {
  //         individuals.push({
  //           ...p,
  //           role: "Partner",
  //           ownership: p.ownership || null,
  //         });
  //       });
  //       (data.managers || []).forEach((m) => {
  //         individuals.push({
  //           ...m,
  //           role: "Manager",
  //           ownership: null,
  //         });
  //       });
  //       break;

  //     case "private_limited":
  //       (data.directors || []).forEach((d) => {
  //         individuals.push({
  //           ...d,
  //           role: "Director",
  //           ownership: null,
  //         });
  //       });
  //       (data.shareholders || []).forEach((s) => {
  //         individuals.push({
  //           ...s,
  //           role: "Shareholder",
  //           ownership: s.sharePercentage || null,
  //         });
  //       });
  //       break;

  //     default:
  //       break;
  //   }

  //   return individuals;
  // };

  const buildFormPayload = (data) => {
    // shallow copy top-level fields
    const payload = { ...data };

    // Map individuals n extrcat files
    const individuals = mapIndividuals(data);
    payload.individuals = extractFiles(individuals);

    // Remove top-level fields that are now under individuals
    [
      "fullName",
      "idNumber",
      "nationality",
      "residentialAddress",
      "dateOfBirth",
      "idDocument",
      "pepDeclaration",
      "sanctionsDeclaration",
      "fatcaDeclaration",
      "partners",
      "managers",
      "generalPartners",
      "limitedPartners",
      "directors",
      "shareholders",
    ].forEach((key) => delete payload[key]);

    return payload;
  };

  // const buildFormPayload = (formData, config, entityType) => {
  //   // top-level copy of formData
  //   const payload = { ...formData };
  //   const individuals = {};

  //   // Find all repeatable section keys from config
  //   const entityConfig = config.entities[entityType];
  //   const repeatableKeys = Object.values(entityConfig.steps || [])
  //     .map((step) => step.repeatableSections || {})
  //     .reduce((acc, sectionObj) => ({ ...acc, ...sectionObj }), {});

  //   Object.keys(repeatableKeys).forEach((key) => {
  //     if (formData[key]) {
  //       individuals[key] = formData[key]; // wrap repeatable sections
  //       delete payload[key]; // remove from top-level
  //     }
  //   });

  //   // Business type-specific rules
  //   switch (entityType) {
  //     case "sole_proprietorship":
  //       payload.ownership = "100%";
  //       break;

  //     case "general_partnership":
  //       if (individuals.partners) {
  //         Object.values(individuals.partners).forEach((partner) => {
  //           if (!partner.profitSharingRatio) partner.profitSharingRatio = 50;
  //         });
  //       }
  //       break;

  //     case "limited_partnership":
  //       if (individuals.generalPartners) {
  //         Object.values(individuals.generalPartners).forEach(
  //           (gp) => (gp.sharePercentage = gp.sharePercentage || 60),
  //         );
  //       }
  //       if (individuals.limitedPartners) {
  //         Object.values(individuals.limitedPartners).forEach(
  //           (lp) => (lp.sharePercentage = lp.sharePercentage || 40),
  //         );
  //       }
  //       break;

  //     case "private_limited":
  //       // Example: could auto-detect UBOs here if sharePercentage >= 25
  //       break;
  //   }

  //   return { ...payload, individuals };
  // };

  /* ------------------------------------------------ */
  /* SAVE DRAFT */
  /* ------------------------------------------------ */
  const handleSaveDraft = async () => {
    try {
      // Flatten formData before validating

      // const cleanData = buildFormPayload(formData);
      const cleanData = buildFormPayload(
        formData,
        SINGAPORE_CONFIG2,
        formData.businessType,
      );
      // const cleanData = {};
      // const flatten = (obj) => {
      //   if (!obj || typeof obj !== "object") return;
      //   Object.entries(obj).forEach(([key, value]) => {
      //     if (key === "null" || value === null || value === undefined) return;
      //     if (
      //       typeof value === "object" &&
      //       !Array.isArray(value) &&
      //       !(value instanceof File)
      //     ) {
      //       flatten(value);
      //     } else {
      //       cleanData[key] = value === "" ? null : value;
      //     }
      //   });
      // };
      // flatten(formData);

      // console.log("Cleaned data before saving draft:", cleanData); // debug log

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

      const normalizedData = {
        ...cleanData,
        businessName: cleanData.businessName || cleanData.business_name || "",
        businessType: cleanData.businessType || cleanData.business_type || "",
        country: cleanData.country || cleanData.business_country || "",
      };
      console.log(cleanData);
      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: cleanData.businessName || "",
        business_type: cleanData.businessType || "",
        business_country: cleanData.country || "",
        form_data: { ...normalizedData},
        last_saved_step: clampedStep,
        application_id: appId !== "new" ? appId : undefined,
      };

      console.log("Saving application draft payload:", payload); // debug log

      const res = await saveApplicationDraftApi(payload);

      // Always get returned application_id (new or existing)
      const savedAppId = res.application_id || appId;

      // Update Redux with saved draft
      dispatch(saveDraftAction({ appId: savedAppId, data: formData }));

      // dispatch(
      //   saveDraftAction({ appId: res.application_id || appId, data: formData }),
      // );

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
      // const { isValid, errors } = validateFormData(formData);
      // if (!isValid) {
      //   toast({
      //     title: "Cannot Submit",
      //     description: "Please fix validation errors before submitting.",
      //     variant: "destructive",
      //   });
      //   console.log("Submit validation errors:", errors);
      //   return;
      // }

      // const cleanData = buildFormPayload(formData);
      const cleanData = buildFormPayload(
        formData,
        SINGAPORE_CONFIG2,
        formData.businessType,
      );
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

      await submitApplicationApi(payload);

      dispatch(submitApplication({ appId, data: formData }));

      navigat

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
          // <Step4ReviewSubmit
          //   {...commonProps}
          //   onSubmit={handleSubmitApplication}
          //   isSubmitting={isSubmitting}
          // />
          <Step4
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
                        !hasNullFields(formData) && (
                          <Button
                            onClick={handleSubmitApplication}
                            disabled={isSubmitting}
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

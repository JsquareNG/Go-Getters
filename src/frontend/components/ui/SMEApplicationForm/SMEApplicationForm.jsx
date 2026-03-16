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
  const isViewOnly = routeMode === "view" || currentApp?.status === "Submitted";

  // --- Edit functionality ---
  const handleEditStep = (step) => {
    navigate(`/application/edit/${appId}/${step}`);
  };

  /* ------------------------------------------------ */
  /* REDUX FIELD UPDATE */
  /* ------------------------------------------------ */

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

      function flatten(obj) {
        if (!obj || typeof obj !== "object") return;
        Object.entries(obj).forEach(([key, value]) => {
          if (value instanceof File) {
            cleanData[key] = value;
          } else if (Array.isArray(value)) {
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

      if ("null" in cleanData) delete cleanData.null;

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
  const validateFormData = (data) => {
    const errors = {};

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

        if (fieldDef.conditionalFields && data[key]) {
          Object.entries(fieldDef.conditionalFields[data[key]] || {}).forEach(
            ([cKey, cDef]) => {
              if (cDef.required) requiredFields.push(cKey);
            },
          );
        }
      });

      const repeatableSections = step.repeatableSections || {};
      Object.values(repeatableSections).forEach((section) => {
        Object.entries(section.fields || {}).forEach(([key, fieldDef]) => {
          if (fieldDef.required) requiredFields.push(key);

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

    const individuals = mapIndividuals(data);
    const individualFields = Object.keys(individuals);
    for (const field of individualFields) {
      if (individuals[field] === null || individuals[field] === undefined) {
        return true;
      }
    }

    return false;
  };

  function extractFileFields(config, path = []) {
    let files = [];

    for (const key in config) {
      const field = config[key];

      if (!field) continue;

      if (field.type === "file") {
        files.push({ path: [...path, key], field });
      }

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

      if (field.fields && typeof field.fields === "object") {
        files.push(...extractFileFields(field.fields, [...path, key]));
      }
    }

    return files;
  }

  const extractFiles = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    if (obj instanceof File) return obj;

    if ("file" in obj && obj.file instanceof File) return obj.file;

    if (Array.isArray(obj)) return obj.map(extractFiles);

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

    const declarations = [
      "pepDeclaration",
      "sanctionsDeclaration",
      "fatcaDeclaration",
    ];

    declarations.forEach((decl) => {
      if (data[decl]) {
        individual[decl] = data[decl];

        const configFields =
          SINGAPORE_CONFIG2.entities.sole_proprietorship.steps[0]
            .repeatableSections.owners.fields[decl]?.conditionalFields;

        if (configFields?.[data[decl]]) {
          Object.keys(configFields[data[decl]]).forEach((key) => {
            individual[key] = data[key] ?? null;
          });
        }
      }
    });

    return individual;
  };

  const buildFormPayload = (data) => {
    const payload = { ...data };

    const individuals = mapIndividuals(data);
    payload.individuals = extractFiles(individuals);

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

  /* ------------------------------------------------ */
  /* SAVE DRAFT */
  /* ------------------------------------------------ */
  const handleSaveDraft = async () => {
    try {
      const cleanData = buildFormPayload(
        formData,
        SINGAPORE_CONFIG2,
        formData.businessType,
      );

      const normalizedData = {
        ...cleanData,
        provider_session_id: formData.provider_session_id || null,
        businessName: cleanData.businessName || cleanData.business_name || "",
        businessType: cleanData.businessType || cleanData.business_type || "",
        country: cleanData.country || cleanData.business_country || "",
      };

      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: cleanData.businessName || "",
        business_type: cleanData.businessType || "",
        business_country: cleanData.country || "",
        form_data: { ...normalizedData },
        last_saved_step: clampedStep,
        application_id: appId !== "new" ? appId : undefined,
      };

      console.log("Saving application draft payload:", payload);

      const res = await saveApplicationDraftApi(payload);

      const savedAppId = res.application_id || appId;

      dispatch(saveDraftAction({ appId: savedAppId, data: formData }));

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
      const cleanData = buildFormPayload(
        formData,
        SINGAPORE_CONFIG2,
        formData.businessType,
      );

      const providerSessionId = formData.provider_session_id;

      if (!providerSessionId) {
        toast({
          title: "Identity Verification Required",
          description: "Please complete identity verification before submitting.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        business_name: cleanData.businessName || "",
        business_type: cleanData.businessType || "",
        business_country: cleanData.country || "",
        form_data: cleanData,
        provider_session_id: providerSessionId,
        last_saved_step: clampedStep,
        application_id: appId !== "new" ? appId : undefined,
      };

      await submitApplicationApi(payload);

      dispatch(submitApplication({ appId, data: formData }));

      navigate(`/landingpage`);

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
                      <Button
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={isSubmitting}
                      >
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
                        !hasNullFields(formData) && (
                          <Button
                            onClick={handleSubmitApplication}
                            disabled={isSubmitting || !formData.provider_session_id}
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
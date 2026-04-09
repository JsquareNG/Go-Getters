import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "../primitives/Button";
import { Card, CardContent } from "../primitives/Card";
import FormStepper from "./components/FormStepper";
import ReadOnlyFormWrapper from "./components/ReadOnlyFormWrapper";
import MissingSteps from "./components/MissingSteps";

import Step0Brief from "./steps/Step0Brief";
import Step1BasicInformation from "./steps/Step1BasicInformation";
import Step2FinancialDetails from "./steps/Step2FinancialDetails";
import Step3ComplianceDocumentation from "./steps/Step3ComplianceDocumentation";
import Step4 from "./steps/Step4";

import { SINGAPORE_CONFIG, INDONESIA_CONFIG } from "./config";
import { snakeToCamelDeep } from "./utils/dataNormalizer";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "@/store/authSlice";
import {
  selectCurrentApplication,
  selectFormData,
  selectCurrentStep,
  setCurrentStep,
  saveDraft as saveDraftAction,
  submitApplication,
  updateField,
  loadApplication,
  startNewApplication,
} from "@/store/applicationFormSlice";

import {
  submitSmeApplicationApi,
  saveApplicationDraftApi,
  getApplicationByAppId,
  getApplicationsByUserId,
} from "@/api/applicationApi";

import { allDocuments } from "@/api/documentApi";

import { getMergedFormState } from "./utils/formDataHelpers";
import { buildDynamicPayload } from "./utils/payloadBuilder";
import {
  buildExistingDocumentMap,
  uploadAllDocumentsFromFormData,
} from "./utils/documentUploadHelpers";
import { buildValidationReport } from "./utils/validationHelpers";

const STEP_LABELS = [
  "To Get Started",
  "Basic Information",
  "Financial Details",
  "Documentation",
  "Review & Submit",
];

const CONFIG_MAP = {
  Singapore: SINGAPORE_CONFIG,
  Indonesia: INDONESIA_CONFIG,
};

const SMEApplicationForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const formData = useSelector(selectFormData);
  const user = useSelector(selectUser);
  const currentApp = useSelector(selectCurrentApplication);
  const currentStepFromRedux = useSelector(selectCurrentStep);

  const { appId, step: routeStep } = useParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingDocuments, setExistingDocuments] = useState([]);

  const routeMode = window.location.pathname.includes("/application/view/")
    ? "view"
    : "edit";

  const routeStepNumber = parseInt(routeStep, 10);
  const clampedStep = Number.isNaN(routeStepNumber)
    ? 0
    : Math.max(0, Math.min(4, routeStepNumber));

  const isViewOnly = routeMode === "view" || currentApp?.status === "Submitted";

  const handleEditStep = (step) => {
    navigate(`/application/edit/${appId}/${step}`);
  };

  const handleFieldChange = useCallback(
    (fieldPath, value) => {
      if (!fieldPath) return;
      dispatch(updateField({ field: fieldPath, value }));
    },
    [dispatch],
  );

  const setNestedValue = (obj, path, value) => {
    const keys = path.split(".");
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };

    let current = clone;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = !Number.isNaN(Number(keys[i])) ? Number(keys[i]) : keys[i];
      const nextKeyRaw = keys[i + 1];
      const nextIsIndex = !Number.isNaN(Number(nextKeyRaw));

      const existing = current[key];

      current[key] =
        existing != null
          ? Array.isArray(existing)
            ? [...existing]
            : { ...existing }
          : nextIsIndex
            ? []
            : {};

      current = current[key];
    }

    const last = !Number.isNaN(Number(keys[keys.length - 1]))
      ? Number(keys[keys.length - 1])
      : keys[keys.length - 1];

    current[last] = value;
    return clone;
  };

  const mergedFormData = useMemo(
    () => getMergedFormState(formData),
    [formData],
  );

  const selectedBusinessType =
    mergedFormData?.businessType || mergedFormData?.business_type || "";

  const selectedCountry =
    mergedFormData?.country ||
    mergedFormData?.businessCountry ||
    mergedFormData?.business_country ||
    "";

  const activeConfig = CONFIG_MAP[selectedCountry] || SINGAPORE_CONFIG;
  const isStep0Valid = Boolean(selectedCountry && selectedBusinessType);

  const entityConfig = useMemo(() => {
    if (!selectedBusinessType) return null;
    return activeConfig?.entities?.[selectedBusinessType] || null;
  }, [activeConfig, selectedBusinessType]);

  const hasConfigSteps =
    Array.isArray(entityConfig?.steps) && entityConfig.steps.length > 0;

  useEffect(() => {
    if (!appId || appId === "new") {
      setExistingDocuments([]);
      return;
    }

    const fetchDocuments = async () => {
      try {
        const docs = await allDocuments(appId);
        setExistingDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
        setExistingDocuments([]);
      }
    };

    fetchDocuments();
  }, [appId]);

  // const handlePersistKycResult = useCallback(
  //   async ({
  //     provider_session_id,
  //     kycData,
  //     providerSessionField = "provider_session_id",
  //     kycDataField = "kycData",
  //   }) => {
  //     dispatch(
  //       updateField({
  //         field: providerSessionField,
  //         value: provider_session_id,
  //       }),
  //     );
  //     dispatch(updateField({ field: kycDataField, value: kycData }));

  //     const patchedFormData = {
  //       ...formData,
  //       [providerSessionField]: provider_session_id,
  //       [kycDataField]: kycData,
  //     };

  //     try {
  //       let savedAppId = currentApp?.applicationId || appId;

  //       const cleanedFormPayload = buildDynamicPayload({
  //         rawFormData: patchedFormData,
  //         config: activeConfig,
  //         providerSessionId: provider_session_id,
  //       });

  //       const payload = {
  //         ...(savedAppId && savedAppId !== "new"
  //           ? { application_id: savedAppId }
  //           : {}),
  //         user_id: user.user_id,
  //         email: user.email,
  //         first_name: user.first_name ?? user.firstName ?? "",
  //         last_saved_step: currentStepFromRedux,
  //         previous_status: patchedFormData?.previous_status || null,
  //         current_status: patchedFormData?.current_status || "Draft",
  //         form_data: cleanedFormPayload,
  //       };

  //       const res = await saveApplicationDraftApi(payload);
  //       savedAppId = res.application_id || savedAppId;

  //       dispatch(saveDraftAction({ appId: savedAppId, data: patchedFormData }));
  //     } catch (err) {
  //       toast({
  //         title: "KYC verified but draft not saved",
  //         description: err?.message || "Please click Save Draft manually.",
  //         variant: "destructive",
  //       });
  //     }
  //   },
  //   [
  //     dispatch,
  //     formData,
  //     currentApp?.applicationId,
  //     appId,
  //     activeConfig,
  //     user,
  //     currentStepFromRedux,
  //     toast,
  //   ],
  // );
  const handlePersistKycResult = useCallback(
    async ({
      provider_session_id,
      kycData,
      mappedFields = {},
      providerSessionField = "provider_session_id",
      kycDataField = "kyc",
      rowPrefix = "",
    }) => {
      const qualify = (field) => (rowPrefix ? `${rowPrefix}.${field}` : field);

      const qualifiedProviderSessionField = qualify(providerSessionField);
      const qualifiedKycDataField = qualify(kycDataField);

      dispatch(
        updateField({
          field: qualifiedProviderSessionField,
          value: provider_session_id,
        }),
      );

      dispatch(
        updateField({
          field: qualifiedKycDataField,
          value: kycData,
        }),
      );

      let patchedFormData = formData;
      patchedFormData = setNestedValue(
        patchedFormData,
        qualifiedProviderSessionField,
        provider_session_id,
      );
      patchedFormData = setNestedValue(
        patchedFormData,
        qualifiedKycDataField,
        kycData,
      );

      Object.entries(mappedFields || {}).forEach(([fieldName, fieldValue]) => {
        const qualifiedField = qualify(fieldName);

        dispatch(
          updateField({
            field: qualifiedField,
            value: fieldValue,
          }),
        );

        patchedFormData = setNestedValue(
          patchedFormData,
          qualifiedField,
          fieldValue,
        );
      });

      // try {
      //   let savedAppId = currentApp?.applicationId || appId;

      //   const cleanedFormPayload = buildDynamicPayload({
      //     rawFormData: patchedFormData,
      //     config: activeConfig,
      //   });

      //   const payload = {
      //     ...(savedAppId && savedAppId !== "new"
      //       ? { application_id: savedAppId }
      //       : {}),
      //     user_id: user.user_id,
      //     email: user.email,
      //     first_name: user.first_name ?? user.firstName ?? "",
      //     last_saved_step: currentStepFromRedux,
      //     previous_status: patchedFormData?.previous_status || null,
      //     current_status: patchedFormData?.current_status || "Draft",
      //     form_data: cleanedFormPayload,
      //   };

      //   const res = await saveApplicationDraftApi(payload);
      //   savedAppId = res.application_id || savedAppId;

      //   dispatch(saveDraftAction({ appId: savedAppId, data: patchedFormData }));
      // } catch (err) {
      //   toast({
      //     title: "KYC verified but draft not saved",
      //     description: err?.message || "Please click Save Draft manually.",
      //     variant: "destructive",
      //   });
      // }
      try {
        await persistApplication({
          isInitial: false,
          rawFormDataOverride: patchedFormData,
        });
      } catch (err) {
        toast({
          title: "KYC verified but draft not saved",
          description: err?.message || "Please click Save Draft manually.",
          variant: "destructive",
        });
      }
    },
    [
      dispatch,
      formData,
      currentApp?.applicationId,
      appId,
      activeConfig,
      user,
      currentStepFromRedux,
      toast,
    ],
  );

  const existingDocumentMap = useMemo(
    () => buildExistingDocumentMap(existingDocuments),
    [existingDocuments],
  );

  const validationReport = useMemo(
    () =>
      buildValidationReport({
        rawData: formData,
        activeConfig,
        stepLabels: STEP_LABELS,
        existingDocumentMap,
      }),
    [formData, activeConfig, existingDocumentMap],
  );

  const isIncomplete = validationReport.total > 0;

  useEffect(() => {
    console.log("VALIDATION REPORT:", validationReport);
  }, [validationReport]);

  const canSubmit =
    clampedStep === 4 && isStep0Valid && hasConfigSteps && !isIncomplete;

  const goToStep = useCallback(
    (targetStep) => {
      if (targetStep === 0) {
        navigate(`/application/${routeMode}/${appId}/${targetStep}`);
        return;
      }

      if (targetStep >= 1 && targetStep <= 3) {
        if (!isStep0Valid) {
          toast({
            title: "Fill in missing fields first",
            description:
              "Please select country and business type before proceeding.",
            variant: "destructive",
          });
          return;
        }

        navigate(`/application/${routeMode}/${appId}/${targetStep}`);
        return;
      }

      if (targetStep === 4) {
        if (!isStep0Valid) {
          toast({
            title: "Fill in missing fields first",
            description:
              "Please select country and business type before proceeding.",
            variant: "destructive",
          });
          return;
        }

        if (!hasConfigSteps) {
          toast({
            title: "Form structure unavailable",
            description:
              "Could not determine required fields for this application yet.",
            variant: "destructive",
          });
          return;
        }

        navigate(`/application/${routeMode}/${appId}/${targetStep}`);
      }
    },
    [navigate, routeMode, appId, isStep0Valid, hasConfigSteps, toast],
  );

  const persistApplication = async ({
    isInitial = false,
    rawFormDataOverride = null,
  } = {}) => {
    const effectiveFormData = rawFormDataOverride || formData;
    try {
      let savedAppId = currentApp?.applicationId || appId;

      if (isInitial) {
        if (!selectedCountry || !selectedBusinessType) {
          toast({
            title: "Missing required fields",
            description: "Please select country and business type first.",
            variant: "destructive",
          });
          return null;
        }

        const initialPayload = {
          ...(savedAppId && savedAppId !== "new"
            ? { application_id: savedAppId }
            : {}),
          user_id: user.user_id,
          form_data: {
            country: selectedCountry,
            businessType: selectedBusinessType,
            businessCountry: selectedCountry,
            businessName: "",
          },
        };

        const res = await saveApplicationDraftApi(initialPayload);
        savedAppId = res.application_id || savedAppId;

        dispatch(
          loadApplication({
            applicationId: savedAppId,
            formData: {
              country: selectedCountry,
              businessType: selectedBusinessType,
              businessCountry: selectedCountry,
              businessName: "",
              last_saved_step: 0,
              previous_status: null,
              current_status: "Draft",
            },
            status: "Draft",
          }),
        );

        return savedAppId;
      }

      const providerSessionId =
        effectiveFormData?.provider_session_id ||
        effectiveFormData?.individuals?.find((p) => p?.provider_session_id)
          ?.provider_session_id ||
        null;

      const cleanedFormPayload = buildDynamicPayload({
        rawFormData: effectiveFormData,
        config: activeConfig,
        providerSessionId: providerSessionId,
      });

      const payload = {
        ...(savedAppId && savedAppId !== "new"
          ? { application_id: savedAppId }
          : {}),
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name ?? user.firstName ?? "",
        last_saved_step: currentStepFromRedux,
        // previous_status: formData?.previous_status || null,
        // current_status: formData?.current_status || "Draft",
        previous_status: effectiveFormData?.previous_status || null,
        current_status: effectiveFormData?.current_status || "Draft",
        form_data: cleanedFormPayload,
      };

      const res = await saveApplicationDraftApi(payload);
      savedAppId = res.application_id || savedAppId;

      // await uploadAllDocumentsFromFormData(formData, activeConfig, savedAppId);
      // dispatch(saveDraftAction({ appId: savedAppId, data: formData }));
      await uploadAllDocumentsFromFormData(
        effectiveFormData,
        activeConfig,
        savedAppId,
      );
      dispatch(saveDraftAction({ appId: savedAppId, data: effectiveFormData }));

      return savedAppId;
    } catch (err) {
      toast({
        title: isInitial ? "Failed to start application" : "Save Failed",
        description:
          err?.message ||
          (isInitial
            ? "Could not create draft application."
            : "Failed to save draft."),
        variant: "destructive",
      });
      return null;
    }
  };

  const handleStartApplication = async () => {
    const savedAppId = await persistApplication({ isInitial: true });

    if (savedAppId) {
      navigate(`/application/edit/${savedAppId}/1`, { replace: true });
    }
  };

  useEffect(() => {
    const initApplication = async () => {
      try {
        if (appId && appId !== "new") {
          const app = await getApplicationByAppId(appId);

          const flattenSavedFormData = (input = {}) => {
            let flat = snakeToCamelDeep(input);

            while (flat?.formData || flat?.form_data) {
              flat = {
                ...flat,
                ...(flat.formData || {}),
                ...(flat.form_data || {}),
              };
              delete flat.formData;
              delete flat.form_data;
            }

            return flat;
          };

          const cleanedFormData = flattenSavedFormData(app?.form_data || {});
          const mergedLoadedFormData = {
            ...cleanedFormData,
            businessName:
              cleanedFormData.businessName ?? app?.business_name ?? "",
            businessType:
              cleanedFormData.businessType ?? app?.business_type ?? "",
            businessCountry:
              cleanedFormData.businessCountry ?? app?.business_country ?? "",
            country: cleanedFormData.country ?? app?.business_country ?? "",
            last_saved_step: app?.last_saved_step ?? 0,
            previous_status: app?.previous_status ?? null,
            current_status: app?.current_status ?? "Draft",
          };

          dispatch(
            loadApplication({
              applicationId: app.application_id,
              formData: mergedLoadedFormData,
              status: app.current_status || "Draft",
            }),
          );
          return;
        }

        if (user?.user_id) {
          const apps = await getApplicationsByUserId(user.user_id);
          const existingDraft = (apps || []).find(
            (a) => a.current_status === "Draft",
          );

          if (existingDraft?.application_id) {
            navigate(
              `/application/edit/${existingDraft.application_id}/${existingDraft.last_saved_step ?? 0}`,
              { replace: true },
            );
            return;
          }
        }

        dispatch(startNewApplication());
      } catch (err) {
        console.error("Failed to initialize application", err);
        dispatch(startNewApplication());
      }
    };

    initApplication();
  }, [appId, user?.user_id, dispatch, navigate]);

  useEffect(() => {
    if (clampedStep !== currentStepFromRedux) {
      dispatch(setCurrentStep(clampedStep));
    }
  }, [clampedStep, currentStepFromRedux, dispatch]);

  const handleSaveDraft = async () => {
    const savedAppId = await persistApplication({ isInitial: false });

    if (savedAppId && appId === "new") {
      navigate(`/application/edit/${savedAppId}/${currentStepFromRedux}`, {
        replace: true,
      });
    }

    if (savedAppId) {
      toast({
        title: "Draft Saved",
        description: "Your draft has been saved successfully.",
      });
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);

    try {
      let savedAppId = currentApp?.applicationId || appId;

      const cleanedFormPayload = buildDynamicPayload({
        rawFormData: formData,
        config: activeConfig,
        providerSessionId: formData.provider_session_id || null,
      });

      // const providerSessionId = formData.provider_session_id;
      const providerSessionId =
        formData?.provider_session_id ||
        formData?.individuals?.find((p) => p?.provider_session_id)
          ?.provider_session_id ||
        null;

      if (!providerSessionId) {
        toast({
          title: "Identity Verification Required",
          description:
            "Please complete identity verification before submitting.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        ...(savedAppId && savedAppId !== "new"
          ? { application_id: savedAppId }
          : {}),
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name ?? user.firstName ?? "",
        last_saved_step: currentStepFromRedux,
        previous_status: formData?.previous_status || null,
        current_status: formData?.current_status || "Draft",
        form_data: cleanedFormPayload,
        provider_session_id: providerSessionId,
      };

      const res = await submitSmeApplicationApi(payload);
      savedAppId = res?.application_id || savedAppId;

      await uploadAllDocumentsFromFormData(formData, activeConfig, savedAppId);

      dispatch(submitApplication({ appId: savedAppId, data: formData }));

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

  const commonProps = useMemo(
    () => ({
      data: formData,
      onFieldChange: handleFieldChange,
      disabled: isViewOnly,
    }),
    [formData, handleFieldChange, isViewOnly],
  );

  const isStep0Locked = Boolean(appId && appId !== "new");

  const getStepComponent = () => {
    switch (clampedStep) {
      case 0:
        return <Step0Brief {...commonProps} locked={isStep0Locked} />;
      case 1:
        return (
          <Step1BasicInformation
            {...commonProps}
            applicationId={appId}
            onPersistKycResult={handlePersistKycResult}
          />
        );
      case 2:
        return <Step2FinancialDetails {...commonProps} />;
      case 3:
        return (
          <Step3ComplianceDocumentation
            {...commonProps}
            documents={formData.documents}
            documentsProgress={formData.documentsProgress}
            applicationId={appId}
          />
        );
      case 4:
        return (
          <Step4
            {...commonProps}
            onSubmit={handleSubmitApplication}
            isSubmitting={isSubmitting}
            onEdit={handleEditStep}
            applicationId={appId}
          />
        );
      default:
        return null;
    }
  };

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

          {!isViewOnly && <MissingSteps report={validationReport} />}
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
                      {clampedStep === 0 ? (
                        <Button
                          onClick={handleStartApplication}
                          disabled={isSubmitting || !isStep0Valid}
                        >
                          Start Application
                        </Button>
                      ) : clampedStep < 4 ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={isSubmitting}
                          >
                            Save Draft
                          </Button>

                          <Button onClick={() => goToStep(clampedStep + 1)}>
                            Next
                          </Button>
                        </>
                      ) : canSubmit ? (
                        <Button
                          onClick={handleSubmitApplication}
                          disabled={isSubmitting}
                        >
                          Submit
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={isSubmitting}
                        >
                          Save Draft
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

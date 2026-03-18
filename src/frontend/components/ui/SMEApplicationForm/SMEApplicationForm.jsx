import React, { useEffect, useState, useCallback, useMemo } from "react";
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

import { uploadDocumentApi } from "@/api/documentApi";

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

const BASE_INDIVIDUAL_KEYS = [
  "fullName",
  "idNumber",
  "idDocument",
  "dateOfBirth",
  "nationality",
  "residentialAddress",
];

const FORM_META_KEYS_TO_REMOVE = [
  "user_id",
  "email",
  "first_name",
  "last_saved_step",
  "previous_status",
  "current_status",
  "formData",
  "form_data",
  "userId",
  "firstName",
  "currentStatus",
  "lastSavedStep",
  "previousStatus",
];

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

  const routeMode = window.location.pathname.includes("/application/view/")
    ? "view"
    : "edit";

  const routeStepNumber = parseInt(routeStep, 10);
  const clampedStep = Number.isNaN(routeStepNumber)
    ? 0
    : Math.max(0, Math.min(4, routeStepNumber));

  const isViewOnly = routeMode === "view" || currentApp?.status === "Submitted";

  const activeConfig = CONFIG_MAP[formData?.country] || SINGAPORE_CONFIG;

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

  const getMergedFormState = useCallback((rawFormData = {}) => {
    const nested = rawFormData?.formData || {};
    return {
      ...rawFormData,
      ...nested,
      individuals: nested.individuals ?? rawFormData.individuals ?? [],
    };
  }, []);

  const flattenFieldKeys = useCallback((fields = {}) => {
    const keys = new Set();

    Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
      keys.add(fieldKey);

      if (fieldConfig?.conditionalFields) {
        Object.values(fieldConfig.conditionalFields).forEach((nestedFields) => {
          Object.keys(nestedFields || {}).forEach((k) => keys.add(k));
        });
      }

      if (fieldKey === "conditionalFields" && typeof fieldConfig === "object") {
        Object.values(fieldConfig).forEach((nestedFields) => {
          Object.keys(nestedFields || {}).forEach((k) => keys.add(k));
        });
      }
    });

    return [...keys];
  }, []);

  const isIndividualLikeSection = useCallback(
    (sectionConfig = {}) => {
      const allKeys = flattenFieldKeys(sectionConfig.fields || {});
      return BASE_INDIVIDUAL_KEYS.some((key) => allKeys.includes(key));
    },
    [flattenFieldKeys],
  );

  const getEntityConfig = useCallback((data, config) => {
    const businessType = data?.businessType || data?.business_type;
    if (!businessType) return null;
    return config?.entities?.[businessType] || null;
  }, []);

  const getSectionRoleValue = useCallback((sectionKey, sectionConfig) => {
    return sectionConfig?.fields?.role?.value || sectionKey;
  }, []);

  const mapIndividualsDynamic = useCallback(
    (rawData, config) => {
      const data = getMergedFormState(rawData);
      const entityConfig = getEntityConfig(data, config);
      if (!entityConfig?.steps) return [];

      const allIndividuals = Array.isArray(data.individuals)
        ? data.individuals
        : [];

      const individuals = [];

      entityConfig.steps.forEach((step) => {
        const repeatableSections = step.repeatableSections || {};

        Object.entries(repeatableSections).forEach(
          ([sectionKey, sectionConfig]) => {
            if (!isIndividualLikeSection(sectionConfig)) return;

            let sectionData = [];

            if (sectionConfig?.storage === "individuals") {
              const roleValue = getSectionRoleValue(sectionKey, sectionConfig);
              sectionData = allIndividuals.filter(
                (item) => item?.role === roleValue,
              );
            } else {
              sectionData = Array.isArray(data[sectionKey])
                ? data[sectionKey]
                : [];
            }

            sectionData.forEach((item) => {
              const individual = {};

              Object.entries(sectionConfig.fields || {}).forEach(
                ([fieldKey, fieldConfig]) => {
                  if (fieldKey === "conditionalFields") return;

                  individual[fieldKey] =
                    item?.[fieldKey] ?? fieldConfig?.value ?? null;

                  if (fieldConfig?.conditionalFields && item?.[fieldKey]) {
                    Object.entries(
                      fieldConfig.conditionalFields[item[fieldKey]] || {},
                    ).forEach(([conditionalKey, conditionalConfig]) => {
                      individual[conditionalKey] =
                        item?.[conditionalKey] ??
                        conditionalConfig?.value ??
                        null;
                    });
                  }
                },
              );

              const sectionConditionalFields =
                sectionConfig.fields?.conditionalFields || null;

              if (
                sectionConditionalFields &&
                item?.shareholderType &&
                sectionConditionalFields[item.shareholderType]
              ) {
                Object.entries(
                  sectionConditionalFields[item.shareholderType],
                ).forEach(([conditionalKey, conditionalConfig]) => {
                  individual[conditionalKey] =
                    item?.[conditionalKey] ?? conditionalConfig?.value ?? null;
                });
              }

              individual.role =
                item?.role || getSectionRoleValue(sectionKey, sectionConfig);

              individuals.push(individual);
            });
          },
        );
      });

      return individuals;
    },
    [
      getMergedFormState,
      getEntityConfig,
      isIndividualLikeSection,
      getSectionRoleValue,
    ],
  );

  const mapNonIndividualRepeatableData = useCallback(
    (rawData, config) => {
      const data = getMergedFormState(rawData);
      const entityConfig = getEntityConfig(data, config);
      if (!entityConfig?.steps) return {};

      const mapped = {};

      entityConfig.steps.forEach((step) => {
        const repeatableSections = step.repeatableSections || {};

        Object.entries(repeatableSections).forEach(
          ([sectionKey, sectionConfig]) => {
            if (isIndividualLikeSection(sectionConfig)) return;

            const sectionData = Array.isArray(data[sectionKey])
              ? data[sectionKey]
              : [];

            mapped[sectionKey] = sectionData.map((item) => {
              const obj = {};

              Object.entries(sectionConfig.fields || {}).forEach(
                ([fieldKey, fieldConfig]) => {
                  if (fieldKey === "conditionalFields") return;

                  obj[fieldKey] =
                    item?.[fieldKey] ?? fieldConfig?.value ?? null;

                  if (fieldConfig?.conditionalFields && item?.[fieldKey]) {
                    Object.entries(
                      fieldConfig.conditionalFields[item[fieldKey]] || {},
                    ).forEach(([conditionalKey, conditionalConfig]) => {
                      obj[conditionalKey] =
                        item?.[conditionalKey] ??
                        conditionalConfig?.value ??
                        null;
                    });
                  }
                },
              );

              const sectionConditionalFields =
                sectionConfig.fields?.conditionalFields || null;

              if (
                sectionConditionalFields &&
                item?.shareholderType &&
                sectionConditionalFields[item.shareholderType]
              ) {
                Object.entries(
                  sectionConditionalFields[item.shareholderType],
                ).forEach(([conditionalKey, conditionalConfig]) => {
                  obj[conditionalKey] =
                    item?.[conditionalKey] ?? conditionalConfig?.value ?? null;
                });
              }

              return obj;
            });
          },
        );
      });

      return mapped;
    },
    [getMergedFormState, getEntityConfig, isIndividualLikeSection],
  );

  const stripIndividualLikeFieldsFromRoot = useCallback(
    (payload, rawData, config) => {
      const data = getMergedFormState(rawData);
      const entityConfig = getEntityConfig(data, config);
      if (!entityConfig?.steps) return payload;

      const cleaned = { ...payload };

      entityConfig.steps.forEach((step) => {
        const repeatableSections = step.repeatableSections || {};

        Object.entries(repeatableSections).forEach(
          ([sectionKey, sectionConfig]) => {
            if (!isIndividualLikeSection(sectionConfig)) return;

            delete cleaned[sectionKey];

            Object.keys(sectionConfig.fields || {}).forEach((fieldKey) => {
              delete cleaned[fieldKey];
            });

            if (sectionConfig.fields?.conditionalFields) {
              Object.values(sectionConfig.fields.conditionalFields).forEach(
                (nestedFields) => {
                  Object.keys(nestedFields || {}).forEach((nestedKey) => {
                    delete cleaned[nestedKey];
                  });
                },
              );
            }

            Object.values(sectionConfig.fields || {}).forEach((fieldConfig) => {
              if (fieldConfig?.conditionalFields) {
                Object.values(fieldConfig.conditionalFields).forEach(
                  (nestedFields) => {
                    Object.keys(nestedFields || {}).forEach((nestedKey) => {
                      delete cleaned[nestedKey];
                    });
                  },
                );
              }
            });
          },
        );
      });

      return cleaned;
    },
    [getMergedFormState, getEntityConfig, isIndividualLikeSection],
  );

  const normalizeFormData = (data) => {
    let flattened = { ...data };

    while (flattened?.formData || flattened?.form_data) {
      flattened = {
        ...flattened,
        ...(flattened.formData || {}),
        ...(flattened.form_data || {}),
      };

      delete flattened.formData;
      delete flattened.form_data;
    }

    return flattened;
  };

  const buildDynamicPayload = useCallback(
    (rawFormData, config) => {
      // const normalizedData = getMergedFormState(rawFormData);
      const normalizedData = normalizeFormData(rawFormData);

      const individuals = mapIndividualsDynamic(normalizedData, config);
      const nonIndividualRepeatables = mapNonIndividualRepeatableData(
        normalizedData,
        config,
      );

      let payload = {
        ...normalizedData,
        ...nonIndividualRepeatables,
        individuals,
        businessName:
          normalizedData.businessName || normalizedData.business_name || "",
        businessType:
          normalizedData.businessType || normalizedData.business_type || null,
        businessCountry:
          normalizedData.businessCountry ||
          normalizedData.business_country ||
          normalizedData.country ||
          null,
      };

      FORM_META_KEYS_TO_REMOVE.forEach((key) => {
        delete payload[key];
      });

      payload = stripIndividualLikeFieldsFromRoot(
        payload,
        normalizedData,
        config,
      );

      // final cleanup safety
      delete payload.formData;
      delete payload.form_data;
      delete payload.current_status;
      delete payload.previous_status;
      delete payload.email;
      delete payload.first_name;
      delete payload.user_id;
      delete payload.last_saved_step;

      return payload;
    },
    [
      getMergedFormState,
      mapIndividualsDynamic,
      mapNonIndividualRepeatableData,
      stripIndividualLikeFieldsFromRoot,
    ],
  );

  const hasIncompleteFields = useCallback(
    (rawData) => {
      const data = getMergedFormState(rawData);
      const businessType = data.businessType;
      if (!businessType) return true;

      const steps = activeConfig?.entities?.[businessType]?.steps || [];

      for (const step of steps) {
        for (const [key, fieldDef] of Object.entries(step.fields || {})) {
          if (fieldDef.required && !data[key]) return true;

          if (fieldDef.conditionalFields && data[key]) {
            const conditional = fieldDef.conditionalFields[data[key]] || {};
            for (const [ck, cd] of Object.entries(conditional)) {
              if (cd.required && !data[ck]) return true;
            }
          }
        }

        const repeatableSections = step.repeatableSections || {};
        for (const [sectionKey, section] of Object.entries(
          repeatableSections,
        )) {
          let rows = [];

          if (section?.storage === "individuals") {
            const roleValue = getSectionRoleValue(sectionKey, section);
            rows = (data.individuals || []).filter(
              (x) => x?.role === roleValue,
            );
          } else {
            rows = Array.isArray(data[sectionKey]) ? data[sectionKey] : [];
          }

          if ((section.min ?? 0) > rows.length) return true;

          for (const item of rows) {
            for (const [k, fDef] of Object.entries(section.fields || {})) {
              if (fDef.required && !item?.[k]) return true;

              if (fDef.conditionalFields && item?.[k]) {
                const conditional = fDef.conditionalFields[item[k]] || {};
                for (const [ck, cd] of Object.entries(conditional)) {
                  if (cd.required && !item?.[ck]) return true;
                }
              }
            }
          }
        }
      }

      return false;
    },
    [activeConfig, getMergedFormState, getSectionRoleValue],
  );

  const uploadDocumentWithAutoAppId = useCallback(
    async ({ applicationId, user, documentType, file, onProgress }) => {
      let resolvedAppId = applicationId;

      if (!resolvedAppId) {
        const tempPayload = {
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name ?? user.firstName ?? "",
          form_data: {},
        };

        const res = await saveApplicationDraftApi(tempPayload);
        resolvedAppId = res.application_id;

        if (!resolvedAppId) {
          throw new Error("Failed to create draft application");
        }
      }

      const uploaded = await uploadDocumentApi(
        {
          application_id: resolvedAppId,
          document_type: documentType,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
        },
        file,
        onProgress,
      );

      return { appId: resolvedAppId, uploaded };
    },
    [],
  );

  useEffect(() => {
    const initApplication = async () => {
      try {
        if (appId && appId !== "new") {
          const app = await getApplicationByAppId(appId);
          // const normalizedFormData = snakeToCamelDeep(app?.form_data || {});

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
          const mergedFormData = {
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

          // const mergedFormData = {
          //   ...normalizedFormData,
          //   businessName:
          //     normalizedFormData.businessName ??
          //     app?.form_data?.business_name ??
          //     "",
          //   businessType:
          //     normalizedFormData.businessType ??
          //     app?.form_data?.business_type ??
          //     "",
          //   businessCountry:
          //     normalizedFormData.businessCountry ??
          //     app?.form_data?.business_country ??
          //     "",
          //   country:
          //     normalizedFormData.country ??
          //     app?.form_data?.business_country ??
          //     "",
          //   last_saved_step: app?.last_saved_step ?? 0,
          //   previous_status: app?.previous_status ?? null,
          //   current_status: app?.current_status ?? "Draft",
          // };

          dispatch(
            loadApplication({
              applicationId: app.application_id,
              formData: mergedFormData,
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
    try {
      let savedAppId = currentApp?.applicationId || appId;

      const documents = formData.documents || {};
      for (const [docType, docValue] of Object.entries(documents)) {
        const files = Array.isArray(docValue) ? docValue : [docValue];

        for (const file of files) {
          if (file instanceof File) {
            const { appId: returnedAppId } = await uploadDocumentWithAutoAppId({
              applicationId: savedAppId,
              user,
              documentType: docType,
              file,
              onProgress: (pct) =>
                console.log(`Uploading ${file.name}: ${pct}%`),
            });
            savedAppId = returnedAppId;
          }
        }
      }

      const cleanedFormPayload = buildDynamicPayload(formData, activeConfig);

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

        business_name: cleanedFormPayload.businessName || "",
        business_country: cleanedFormPayload.businessCountry || "",
        business_type: cleanedFormPayload.businessType || "",

        form_data: cleanedFormPayload,
      };

      // const payload = {
      //   ...(savedAppId && savedAppId !== "new"
      //     ? { application_id: savedAppId }
      //     : {}),
      //   user_id: user.user_id,
      //   email: user.email,
      //   first_name: user.first_name ?? user.firstName ?? "",
      //   last_saved_step: currentStepFromRedux,
      //   previous_status: formData?.previous_status || null,
      //   current_status: formData?.current_status || "Draft",
      //   form_data: buildDynamicPayload(formData, activeConfig),
      // };

      console.log("SAVE DRAFT payload:", payload);

      const res = await saveApplicationDraftApi(payload);
      savedAppId = res.application_id || savedAppId;

      dispatch(saveDraftAction({ appId: savedAppId, data: formData }));

      if (appId === "new" && savedAppId) {
        navigate(`/application/edit/${savedAppId}/${currentStepFromRedux}`, {
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

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);

    try {
      let savedAppId = currentApp?.applicationId || appId;
      const documents = formData.documents || {};

      for (const [docType, docValue] of Object.entries(documents)) {
        const files = Array.isArray(docValue) ? docValue : [docValue];

        for (const file of files) {
          if (file instanceof File) {
            const { appId: returnedAppId } = await uploadDocumentWithAutoAppId({
              applicationId: savedAppId,
              user,
              documentType: docType,
              file,
              onProgress: (pct) =>
                console.log(`Uploading ${file.name}: ${pct}%`),
            });
            savedAppId = returnedAppId;
          }
        }
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
        form_data: buildDynamicPayload(formData, activeConfig),
      };

      await submitSmeApplicationApi(payload);

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

  const getStepComponent = () => {
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

  const MissingSteps = ({ incomplete }) => {
    if (!incomplete) return null;

    return (
      <div className="mt-8">
        <h2 className="font-semibold text-lg mb-2">
          Some required fields are missing
        </h2>
        <p className="text-sm text-red-500">
          Please complete the required fields before submitting.
        </p>
      </div>
    );
  };

  const isIncomplete = hasIncompleteFields(formData);

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

          {!isViewOnly && <MissingSteps incomplete={isIncomplete} />}
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
                        !isIncomplete && (
                          <Button
                            onClick={handleSubmitApplication}
                            disabled={isSubmitting || isIncomplete}
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

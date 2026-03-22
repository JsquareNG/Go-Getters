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

import { uploadDocumentApi, allDocuments } from "@/api/documentApi";

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
  const [existingDocuments, setExistingDocuments] = useState([]);

  const routeMode = window.location.pathname.includes("/application/view/")
    ? "view"
    : "edit";

  const routeStepNumber = parseInt(routeStep, 10);
  const clampedStep = Number.isNaN(routeStepNumber)
    ? 0
    : Math.max(0, Math.min(4, routeStepNumber));

  const isViewOnly = routeMode === "view" || currentApp?.status === "Submitted";

  // --- Edit functionality ---
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

  const mergedFormData = useMemo(
    () => getMergedFormState(formData),
    [formData, getMergedFormState],
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

  // const activeConfig = CONFIG_MAP[formData?.country] || SINGAPORE_CONFIG;

  // const isStep0Valid = Boolean(mergedFormData?.country && selectedBusinessType);

  const entityConfig = useMemo(() => {
    if (!selectedBusinessType) return null;
    return activeConfig?.entities?.[selectedBusinessType] || null;
  }, [activeConfig, selectedBusinessType]);

  const hasConfigSteps =
    Array.isArray(entityConfig?.steps) && entityConfig.steps.length > 0;

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

  //
  // HELPER FUNCTIONS - FOR FILE UPLOADS
  //

  const buildExistingDocumentMap = (documents = []) => {
    return documents.reduce((acc, doc) => {
      acc[doc.document_type] = doc;
      return acc;
    }, {});
  };

  const unwrapFile = (value) => {
    if (!value) return null;
    if (value instanceof File) return value;
    if (value.file instanceof File) return value.file;
    return null;
  };

  const buildDocumentType = ({
    sectionKey = null,
    sectionConfig = null,
    rowIndex = null,
    fieldKey,
  }) => {
    if (!sectionKey) return fieldKey;

    const roleValue = getSectionRoleValue(sectionKey, sectionConfig);

    return `${roleValue}_${rowIndex + 1}_${fieldKey}`;
  };

  const collectFilesFromFieldSet = ({
    fieldSet,
    source,
    sectionKey = null,
    sectionConfig = null,
    rowIndex = null,
    uploads = [],
  }) => {
    Object.entries(fieldSet || {}).forEach(([fieldKey, fieldConfig]) => {
      if (fieldKey === "conditionalFields") return;

      const rawValue = source?.[fieldKey];

      // normal file field
      if (fieldConfig?.type === "file") {
        const file = unwrapFile(rawValue);
        if (file) {
          uploads.push({
            fieldPath: sectionKey
              ? `${sectionKey}.${rowIndex}.${fieldKey}`
              : fieldKey,
            document_type: buildDocumentType({
              sectionKey,
              sectionConfig,
              rowIndex,
              fieldKey,
            }),
            file,
          });
        }
      }

      // field-level conditional fields
      if (fieldConfig?.conditionalFields && rawValue) {
        const nestedFieldSet = fieldConfig.conditionalFields[rawValue] || {};
        collectFilesFromFieldSet({
          fieldSet: nestedFieldSet,
          source,
          sectionKey,
          sectionConfig,
          rowIndex,
          uploads,
        });
      }

      // nested object block
      if (
        typeof fieldConfig === "object" &&
        !fieldConfig.type &&
        !fieldConfig.label &&
        fieldKey !== "conditionalFields"
      ) {
        collectFilesFromFieldSet({
          fieldSet: fieldConfig,
          source: source?.[fieldKey] || {},
          sectionKey,
          sectionConfig,
          rowIndex,
          uploads,
        });
      }
    });

    return uploads;
  };

  const collectFileUploadEntries = (formData, activeConfig) => {
    const businessType = formData?.businessType;
    const entity = activeConfig?.entities?.[businessType];
    if (!entity?.steps) return [];

    const uploads = [];

    entity.steps.forEach((step) => {
      // top-level fields
      collectFilesFromFieldSet({
        fieldSet: step.fields || {},
        source: formData,
        uploads,
      });

      // repeatable sections
      Object.entries(step.repeatableSections || {}).forEach(
        ([sectionKey, sectionConfig]) => {
          let rows = [];

          if (sectionConfig?.storage === "individuals") {
            const roleValue = getSectionRoleValue(sectionKey, sectionConfig);
            rows = (formData?.individuals || []).filter(
              (row) => row?.role === roleValue,
            );
          } else {
            rows = Array.isArray(formData?.[sectionKey])
              ? formData[sectionKey]
              : [];
          }

          rows.forEach((row, rowIndex) => {
            collectFilesFromFieldSet({
              fieldSet: sectionConfig.fields || {},
              source: row,
              sectionKey,
              sectionConfig,
              rowIndex,
              uploads,
            });
          });
        },
      );
    });

    return uploads;
  };

  const replaceDocumentById = async ({ documentId, file }) => {
    const form = new FormData();
    form.append("file", file);

    const replaceRes = await fetch(
      `http://127.0.0.1:8000/documents/replace-upload/${documentId}`,
      {
        method: "POST",
        body: form,
      },
    );

    if (!replaceRes.ok) {
      throw new Error(`Failed to replace upload for document ${documentId}`);
    }

    return await replaceRes.json();
  };

  const initDocumentUpload = async ({ applicationId, documentType, file }) => {
    const initRes = await fetch(
      "http://127.0.0.1:8000/documents/init-persist-upload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application_id: applicationId,
          document_type: documentType,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
        }),
      },
    );

    if (!initRes.ok) {
      throw new Error(`Failed to init upload for ${documentType}`);
    }

    return await initRes.json();
  };

  const uploadSingleDocument = async ({
    applicationId,
    documentType,
    file,
    existingDocumentMap = {},
  }) => {
    const existingDoc = existingDocumentMap[documentType];

    if (existingDoc?.document_id) {
      return await replaceDocumentById({
        documentId: existingDoc.document_id,
        file,
      });
    }

    const initData = await initDocumentUpload({
      applicationId,
      documentType,
      file,
    });

    if (!initData?.document_id) {
      throw new Error(`No document_id returned for ${documentType}`);
    }

    return await replaceDocumentById({
      documentId: initData.document_id,
      file,
    });
  };

  const uploadAllDocumentsFromFormData = async (
    rawFormData,
    activeConfig,
    applicationId,
  ) => {
    const root = {
      ...(rawFormData || {}),
      ...((rawFormData || {}).formData || {}),
      individuals:
        rawFormData?.formData?.individuals ?? rawFormData?.individuals ?? [],
    };

    const uploadEntries = collectFileUploadEntries(root, activeConfig);

    const uniqueUploadEntries = Object.values(
      uploadEntries.reduce((acc, entry) => {
        acc[entry.document_type] = entry;
        return acc;
      }, {}),
    );

    console.log("UPLOAD ENTRIES:", uniqueUploadEntries);

    const existingDocs = await allDocuments(applicationId);
    const existingDocumentMap = buildExistingDocumentMap(existingDocs);

    const uploadedResults = [];

    for (const entry of uniqueUploadEntries) {
      const uploaded = await uploadSingleDocument({
        applicationId,
        documentType: entry.document_type,
        file: entry.file,
        existingDocumentMap,
      });

      uploadedResults.push({
        ...entry,
        uploaded,
      });

      if (uploaded?.document_id) {
        existingDocumentMap[entry.document_type] = {
          document_id: uploaded.document_id,
          document_type: entry.document_type,
        };
      }
    }

    return uploadedResults;
  };

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

  const existingDocumentMap = useMemo(
    () => buildExistingDocumentMap(existingDocuments),
    [existingDocuments],
  );

  const hasUploadedDocument = useCallback(
    ({ value, documentType }) => {
      // local unsaved file in form state
      const localFile = unwrapFile(value);
      if (localFile) return true;

      // already uploaded backend document
      if (documentType && existingDocumentMap[documentType]) return true;

      return false;
    },
    [existingDocumentMap],
  );

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
        provider_session_id: formData.provider_session_id || null,

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

  const isEmptyValue = (value) => {
    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
    );
  };

  const validateStepConfig = useCallback(
    (stepConfig, rawData) => {
      const data = getMergedFormState(rawData);
      const missing = [];

      if (!stepConfig) {
        return { isValid: true, missing: [] };
      }

      // -----------------------------
      // Top-level fields
      // -----------------------------
      for (const [key, fieldDef] of Object.entries(stepConfig.fields || {})) {
        if (fieldDef?.required) {
          if (fieldDef.type === "file") {
            const documentType = buildDocumentType({ fieldKey: key });

            if (
              !hasUploadedDocument({
                value: data[key],
                documentType,
              })
            ) {
              missing.push({
                field: key,
                label: fieldDef.label || key,
                type: "file",
                documentType,
                scope: "top-level",
              });
            }
          } else {
            if (isEmptyValue(data[key])) {
              missing.push({
                field: key,
                label: fieldDef.label || key,
                type: fieldDef.type || "text",
                scope: "top-level",
              });
            }
          }
        }

        // conditional fields under top-level field
        if (fieldDef?.conditionalFields && data[key]) {
          const conditional = fieldDef.conditionalFields[data[key]] || {};

          for (const [ck, cd] of Object.entries(conditional)) {
            if (!cd?.required) continue;

            if (cd.type === "file") {
              const documentType = buildDocumentType({ fieldKey: ck });

              if (
                !hasUploadedDocument({
                  value: data[ck],
                  documentType,
                })
              ) {
                missing.push({
                  field: ck,
                  label: cd.label || ck,
                  parentField: key,
                  type: "file",
                  documentType,
                  scope: "top-level-conditional",
                });
              }
            } else {
              if (isEmptyValue(data[ck])) {
                missing.push({
                  field: ck,
                  label: cd.label || ck,
                  parentField: key,
                  type: cd.type || "text",
                  scope: "top-level-conditional",
                });
              }
            }
          }
        }
      }

      // -----------------------------
      // Repeatable sections
      // -----------------------------
      for (const [sectionKey, section] of Object.entries(
        stepConfig.repeatableSections || {},
      )) {
        let rows = [];

        if (section?.storage === "individuals") {
          const roleValue = getSectionRoleValue(sectionKey, section);
          rows = (data.individuals || []).filter((x) => x?.role === roleValue);
        } else {
          rows = Array.isArray(data[sectionKey]) ? data[sectionKey] : [];
        }

        if ((section.min ?? 0) > rows.length) {
          missing.push({
            field: sectionKey,
            label: `${section.label || sectionKey} (minimum ${section.min})`,
            type: "repeatable-min",
            scope: "repeatable-min",
          });
          continue;
        }

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const item = rows[rowIndex];

          for (const [k, fDef] of Object.entries(section.fields || {})) {
            if (fDef?.required) {
              if (fDef.type === "file") {
                const documentType = buildDocumentType({
                  sectionKey,
                  sectionConfig: section,
                  rowIndex,
                  fieldKey: k,
                });

                if (
                  !hasUploadedDocument({
                    value: item?.[k],
                    documentType,
                  })
                ) {
                  missing.push({
                    field: `${sectionKey}[${rowIndex}].${k}`,
                    label: `${section.label || sectionKey} ${rowIndex + 1} - ${fDef.label || k}`,
                    type: "file",
                    documentType,
                    scope: "repeatable",
                  });
                }
              } else {
                if (isEmptyValue(item?.[k])) {
                  missing.push({
                    field: `${sectionKey}[${rowIndex}].${k}`,
                    label: `${section.label || sectionKey} ${rowIndex + 1} - ${fDef.label || k}`,
                    type: fDef.type || "text",
                    scope: "repeatable",
                  });
                }
              }
            }

            // conditional fields under repeatable field
            if (fDef?.conditionalFields && item?.[k]) {
              const conditional = fDef.conditionalFields[item[k]] || {};

              for (const [ck, cd] of Object.entries(conditional)) {
                if (!cd?.required) continue;

                if (cd.type === "file") {
                  const documentType = buildDocumentType({
                    sectionKey,
                    sectionConfig: section,
                    rowIndex,
                    fieldKey: ck,
                  });

                  if (
                    !hasUploadedDocument({
                      value: item?.[ck],
                      documentType,
                    })
                  ) {
                    missing.push({
                      field: `${sectionKey}[${rowIndex}].${ck}`,
                      label: `${section.label || sectionKey} ${rowIndex + 1} - ${cd.label || ck}`,
                      parentField: k,
                      type: "file",
                      documentType,
                      scope: "repeatable-conditional",
                    });
                  }
                } else {
                  if (isEmptyValue(item?.[ck])) {
                    missing.push({
                      field: `${sectionKey}[${rowIndex}].${ck}`,
                      label: `${section.label || sectionKey} ${rowIndex + 1} - ${cd.label || ck}`,
                      parentField: k,
                      type: cd.type || "text",
                      scope: "repeatable-conditional",
                    });
                  }
                }
              }
            }
          }
        }
      }

      return {
        isValid: missing.length === 0,
        missing,
      };
    },
    [getMergedFormState, getSectionRoleValue, hasUploadedDocument],
  );

  const buildValidationReport = useCallback(
    (rawData) => {
      const data = getMergedFormState(rawData);
      const businessType = data.businessType || data.business_type;

      // Step 0 only
      const step0Missing = [];
      if (!data.country) {
        step0Missing.push({ field: "country", label: "Country" });
      }
      if (!businessType) {
        step0Missing.push({ field: "businessType", label: "Business Type" });
      }

      const byStep = [
        {
          stepId: "step0",
          stepLabel: "To Get Started",
          missing: step0Missing,
        },
      ];

      if (!businessType) {
        return {
          total: step0Missing.length,
          byStep,
        };
      }

      const entity = activeConfig?.entities?.[businessType];
      if (
        !entity ||
        !Array.isArray(entity.steps) ||
        entity.steps.length === 0
      ) {
        byStep.push({
          stepId: "config",
          stepLabel: "Form Configuration",
          missing: [
            {
              field: "config",
              label:
                "No application form configuration found for selected business type",
            },
          ],
        });

        return {
          total: step0Missing.length + 1,
          byStep,
        };
      }

      entity.steps.forEach((step, idx) => {
        const result = validateStepConfig(step, rawData);
        byStep.push({
          stepId: step.id || `step${idx + 1}`,
          stepLabel: STEP_LABELS[idx + 1] || `Step ${idx + 1}`,
          missing: result.missing,
        });
      });

      const total = byStep.reduce((sum, step) => sum + step.missing.length, 0);

      return {
        total,
        byStep,
      };
    },
    [activeConfig, getMergedFormState, validateStepConfig],
  );

  const validationReport = useMemo(
    () => buildValidationReport(formData),
    [formData, buildValidationReport],
  );

  const isIncomplete = validationReport.total > 0;

  useEffect(() => {
    console.log("VALIDATION REPORT:", validationReport);
  }, [validationReport]);

  const canSubmit =
    clampedStep === 4 && isStep0Valid && hasConfigSteps && !isIncomplete;

  const goToStep = useCallback(
    (targetStep) => {
      // Step 0 always accessible
      if (targetStep === 0) {
        navigate(`/application/${routeMode}/${appId}/${targetStep}`);
        return;
      }

      // Steps 1-3 require Step 0 only
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

      // Step 4 requires all previous form steps valid
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
    [
      navigate,
      routeMode,
      appId,
      isStep0Valid,
      hasConfigSteps,
      validationReport,
      toast,
    ],
  );

  // to lock step 0. after users enter fields -> helps with redux startapplication function
  const persistApplication = async ({ isInitial = false } = {}) => {
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

      const cleanedFormPayload = buildDynamicPayload(formData, activeConfig);

      // const providerSessionId = formData.provider_session_id || null;

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

        // provider_session_id: providerSessionId,
      };

      const res = await saveApplicationDraftApi(payload);
      savedAppId = res.application_id || savedAppId;

      await uploadAllDocumentsFromFormData(formData, activeConfig, savedAppId);

      dispatch(saveDraftAction({ appId: savedAppId, data: formData }));

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
      // clear stale form state immediately before loading anything new
      dispatch(startNewApplication());
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

  // const handleSaveDraft = async () => {
  //   try {
  //     let savedAppId = currentApp?.applicationId || appId;

  //     const cleanedFormPayload = buildDynamicPayload(formData, activeConfig);

  //     const payload = {
  //       ...(savedAppId && savedAppId !== "new"
  //         ? { application_id: savedAppId }
  //         : {}),
  //       user_id: user.user_id,
  //       email: user.email,
  //       first_name: user.first_name ?? user.firstName ?? "",
  //       last_saved_step: currentStepFromRedux,
  //       previous_status: formData?.previous_status || null,
  //       current_status: formData?.current_status || "Draft",

  //       // business_name: cleanedFormPayload.businessName || "",
  //       // business_country: cleanedFormPayload.businessCountry || "",
  //       // business_type: cleanedFormPayload.businessType || "",

  //       form_data: cleanedFormPayload,
  //     };

  //     console.log("SAVE DRAFT payload:", payload);

  //     const res = await saveApplicationDraftApi(payload);
  //     savedAppId = res.application_id || savedAppId;

  //     const documents = await uploadAllDocumentsFromFormData(
  //       formData,
  //       activeConfig,
  //       savedAppId,
  //     );
  //     console.log(documents);

  //     dispatch(saveDraftAction({ appId: savedAppId, data: formData }));

  //     if (appId === "new" && savedAppId) {
  //       navigate(`/application/edit/${savedAppId}/${currentStepFromRedux}`, {
  //         replace: true,
  //       });
  //     }

  //     toast({
  //       title: "Draft Saved",
  //       description: "Your draft has been saved successfully.",
  //     });
  //   } catch (err) {
  //     toast({
  //       title: "Save Failed",
  //       description: err?.message || "Failed to save draft.",
  //       variant: "destructive",
  //     });
  //   }
  // };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);

    try {
      let savedAppId = currentApp?.applicationId || appId;

      const cleanedFormPayload = buildDynamicPayload(formData, activeConfig);

      const providerSessionId = formData.provider_session_id;

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

        // business_name: cleanedFormPayload.businessName || "",
        // business_country: cleanedFormPayload.businessCountry || "",
        // business_type: cleanedFormPayload.businessType || "",

        form_data: cleanedFormPayload,

        provider_session_id: providerSessionId,
      };

      const res = await submitSmeApplicationApi(payload);
      savedAppId = res?.application_id || savedAppId;

      const documents = await uploadAllDocumentsFromFormData(
        formData,
        activeConfig,
        savedAppId,
      );
      // console.log("submit documents successfully:", documents);

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
        return <Step1BasicInformation {...commonProps} applicationId={appId} />;
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

  const MissingSteps = ({ report }) => {
    if (!report || report.total === 0) return null;

    return (
      <div className="mt-8">
        <h2 className="font-semibold text-lg mb-2">
          Some required fields are missing
        </h2>
        <p className="text-sm text-red-500 mb-3">
          Please complete the following before submitting.
        </p>

        <div className="space-y-3 overflow-y-auto max-h-120 pr-2 pb-7">
          {report.byStep
            .filter((step) => step.missing.length > 0)
            .map((step, index) => {
              const prevStep = report.byStep[index + 1];

              return (
                <div
                  key={step.stepId}
                  className="rounded-md border border-red-200 bg-red-50 p-3"
                >
                  <p className="font-medium text-red-800 mb-1">
                    {/* {step.stepLabel} */}
                    {prevStep ? prevStep.stepLabel : step.stepLabel}
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {step.missing.map((item, idx) => (
                      <li key={`${step.stepId}-${idx}`}>{item.label}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </div>
      </div>
    );
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
                      {/* {clampedStep < 4 ? (
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
                      )} */}
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

import {
  getMergedFormState,
  getNestedValue,
  isEmptyValue,
  unwrapFile,
} from "./formDataHelpers";
import { getSectionRoleValue } from "./repeatableMappingHelpers";
import { buildDocumentType } from "./documentUploadHelpers";

export const hasUploadedDocument = ({ value, documentType, existingDocumentMap }) => {
  const localFile = unwrapFile(value);
  if (localFile) return true;
  if (documentType && existingDocumentMap[documentType]) return true;
  return false;
};

export const validateStepConfig = ({
  stepConfig,
  rawData,
  existingDocumentMap,
}) => {
  const data = getMergedFormState(rawData);
  const missing = [];

  if (!stepConfig) {
    return { isValid: true, missing: [] };
  }

  for (const [key, fieldDef] of Object.entries(stepConfig.fields || {})) {
    const value = getNestedValue(data, key);

    if (fieldDef?.required) {
      if (fieldDef.type === "file") {
        const documentType = buildDocumentType({ fieldKey: key });

        if (!hasUploadedDocument({ value, documentType, existingDocumentMap })) {
          missing.push({
            field: key,
            label: fieldDef.label || key,
            type: "file",
            documentType,
            scope: "top-level",
          });
        }
      } else if (isEmptyValue(value)) {
        missing.push({
          field: key,
          label: fieldDef.label || key,
          type: fieldDef.type || "text",
          scope: "top-level",
        });
      }
    }

    if (fieldDef?.conditionalFields && value) {
      const conditional = fieldDef.conditionalFields[value] || {};

      for (const [ck, cd] of Object.entries(conditional)) {
        const conditionalValue = getNestedValue(data, ck);

        if (!cd?.required) continue;

        if (cd.type === "file") {
          const documentType = buildDocumentType({ fieldKey: ck });

          if (
            !hasUploadedDocument({
              value: conditionalValue,
              documentType,
              existingDocumentMap,
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
        } else if (isEmptyValue(conditionalValue)) {
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
        const rowValue = getNestedValue(item, k);

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
                value: rowValue,
                documentType,
                existingDocumentMap,
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
          } else if (isEmptyValue(rowValue)) {
            missing.push({
              field: `${sectionKey}[${rowIndex}].${k}`,
              label: `${section.label || sectionKey} ${rowIndex + 1} - ${fDef.label || k}`,
              type: fDef.type || "text",
              scope: "repeatable",
            });
          }
        }

        if (fDef?.conditionalFields && rowValue) {
          const conditional = fDef.conditionalFields[rowValue] || {};

          for (const [ck, cd] of Object.entries(conditional)) {
            const conditionalValue = getNestedValue(item, ck);

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
                  value: conditionalValue,
                  documentType,
                  existingDocumentMap,
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
            } else if (isEmptyValue(conditionalValue)) {
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

  return {
    isValid: missing.length === 0,
    missing,
  };
};

export const buildValidationReport = ({
  rawData,
  activeConfig,
  stepLabels,
  existingDocumentMap,
}) => {
  const data = getMergedFormState(rawData);
  const businessType = data.businessType || data.business_type;

  const step0Missing = [];
  if (!data.country) step0Missing.push({ field: "country", label: "Country" });
  if (!businessType) {
    step0Missing.push({ field: "businessType", label: "Business Type" });
  }

  const byStep = [
    {
      stepId: "step0",
      stepLabel: stepLabels[0],
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
  if (!entity || !Array.isArray(entity.steps) || entity.steps.length === 0) {
    byStep.push({
      stepId: "config",
      stepLabel: "Form Configuration",
      missing: [
        {
          field: "config",
          label: "No application form configuration found for selected business type",
        },
      ],
    });

    return {
      total: step0Missing.length + 1,
      byStep,
    };
  }

  entity.steps.forEach((step, idx) => {
    const result = validateStepConfig({
      stepConfig: step,
      rawData,
      existingDocumentMap,
    });

    byStep.push({
      stepId: step.id || `step${idx + 1}`,
      stepLabel: stepLabels[idx + 1] || `Step ${idx + 1}`,
      missing: result.missing,
    });
  });

  const total = byStep.reduce((sum, step) => sum + step.missing.length, 0);

  return { total, byStep };
};
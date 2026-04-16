import {
  BASE_INDIVIDUAL_KEYS,
  getMergedFormState,
  getNestedValue,
} from "./formDataHelpers";

export const flattenFieldKeys = (fields = {}) => {
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
};

export const getSectionRoleValue = (sectionKey, sectionConfig) => {
  return sectionConfig?.fields?.role?.value || sectionKey;
};

export const isIndividualLikeSection = (sectionConfig = {}) => {
  const allKeys = flattenFieldKeys(sectionConfig.fields || {});
  return BASE_INDIVIDUAL_KEYS.some((key) => allKeys.includes(key));
};

export const getEntityConfig = (data, config) => {
  const businessType = data?.businessType || data?.business_type;
  if (!businessType) return null;
  return config?.entities?.[businessType] || null;
};

export const mapIndividualsDynamic = (rawData, config) => {
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
          sectionData = Array.isArray(data[sectionKey]) ? data[sectionKey] : [];
        }

        sectionData.forEach((item) => {
          const individual = {};

          Object.entries(sectionConfig.fields || {}).forEach(
            ([fieldKey, fieldConfig]) => {
              if (fieldKey === "conditionalFields") return;

              individual[fieldKey] =
                getNestedValue(item, fieldKey) ?? fieldConfig?.value ?? null;

              const triggerValue = getNestedValue(item, fieldKey);

              if (fieldConfig?.conditionalFields && triggerValue) {
                Object.entries(
                  fieldConfig.conditionalFields[triggerValue] || {},
                ).forEach(([conditionalKey, conditionalConfig]) => {
                  individual[conditionalKey] =
                    getNestedValue(item, conditionalKey) ??
                    conditionalConfig?.value ??
                    null;
                });
              }
            },
          );

          individual.role =
            item?.role || getSectionRoleValue(sectionKey, sectionConfig);

          individuals.push(individual);
        });
      },
    );
  });

  return individuals;
};

export const mapNonIndividualRepeatableData = (rawData, config) => {
  const data = getMergedFormState(rawData);
  const entityConfig = getEntityConfig(data, config);
  if (!entityConfig?.steps) return {};

  const mapped = {};

  entityConfig.steps.forEach((step) => {
    const repeatableSections = step.repeatableSections || {};

    Object.entries(repeatableSections).forEach(
      ([sectionKey, sectionConfig]) => {
        if (isIndividualLikeSection(sectionConfig)) return;

        const storageKey = sectionConfig?.storage || sectionKey;
        const allRows = Array.isArray(data[storageKey]) ? data[storageKey] : [];

        const rowTypeField = sectionConfig?.rowTypeField;
        const rowTypeValue = sectionConfig?.rowTypeValue;

        const filteredRows = rowTypeField
          ? allRows.filter((row) => row?.[rowTypeField] === rowTypeValue)
          : allRows;

        const mappedRows = filteredRows.map((item) => {
          const obj = {};

          Object.entries(sectionConfig.fields || {}).forEach(
            ([fieldKey, fieldConfig]) => {
              if (fieldKey === "conditionalFields") return;

              obj[fieldKey] =
                getNestedValue(item, fieldKey) ?? fieldConfig?.value ?? null;

              const triggerValue = getNestedValue(item, fieldKey);

              if (fieldConfig?.conditionalFields && triggerValue) {
                Object.entries(
                  fieldConfig.conditionalFields[triggerValue] || {},
                ).forEach(([conditionalKey, conditionalConfig]) => {
                  obj[conditionalKey] =
                    getNestedValue(item, conditionalKey) ??
                    conditionalConfig?.value ??
                    null;
                });
              }
            },
          );

          return obj;
        });

        if (!mapped[storageKey]) {
          mapped[storageKey] = [];
        }

        mapped[storageKey].push(...mappedRows);
      },
    );
  });

  return mapped;
};

export const stripIndividualLikeFieldsFromRoot = (payload, rawData, config) => {
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
      },
    );
  });

  return cleaned;
};

export const stripNonIndividualRepeatableFieldsFromRoot = (payload, rawData, config) => {
  const data = getMergedFormState(rawData);
  const entityConfig = getEntityConfig(data, config);
  if (!entityConfig?.steps) return payload;

  const cleaned = { ...payload };

  entityConfig.steps.forEach((step) => {
    const repeatableSections = step.repeatableSections || {};

    Object.entries(repeatableSections).forEach(([sectionKey, sectionConfig]) => {
      if (isIndividualLikeSection(sectionConfig)) return;

      delete cleaned[sectionKey];
    });
  });

  return cleaned;
};

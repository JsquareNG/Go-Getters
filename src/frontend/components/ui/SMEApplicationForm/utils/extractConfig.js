// flatten nested fields
function flattenFields(fields, parentKey = null) {
  const extracted = [];

  Object.entries(fields).forEach(([key, value]) => {
    const fieldKey = parentKey ? `${parentKey}.${key}` : key;

    if (value.type) {
      // actual field
      extracted.push({ key: fieldKey, ...value });
    } else if (typeof value === "object") {
      // nested object
      extracted.push(...flattenFields(value, fieldKey));
    }
  });

  return extracted;
}

// extract fields from a step
export function extractFieldsFromStep(stepConfig) {
  const fields = [];

  if (stepConfig.fields) {
    fields.push(...flattenFields(stepConfig.fields));
  }

  if (stepConfig.repeatableSections) {
    Object.entries(stepConfig.repeatableSections).forEach(([sectionKey, sectionConfig]) => {
      const sectionFields = flattenFields(sectionConfig.fields);

      fields.push({
        type: "repeatableSection",
        key: sectionKey,
        label: sectionConfig.label,
        min: sectionConfig.min,
        max: sectionConfig.max,
        fields: sectionFields,
      });
    });
  }

  return fields;
}

// handle conditional fields
export function resolveConditionalFields(field, value) {
  if (!field.conditionalFields) return [];
  const config = field.conditionalFields[value];
  if (!config) return [];
  return flattenFields(config);
}

// check visibility rules
export function isFieldVisible(field, formData) {
  if (!field.visibility) return true;
  const { dependsOn, equals } = field.visibility;
  return formData?.[dependsOn] === equals;
}
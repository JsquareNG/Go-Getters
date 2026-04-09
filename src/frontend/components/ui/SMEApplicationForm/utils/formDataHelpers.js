export const FORM_META_KEYS_TO_REMOVE = [
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

export const BASE_INDIVIDUAL_KEYS = [
  "fullName",
  "idNumber",
  "idDocument",
  "dateOfBirth",
  "nationality",
  "residentialAddress",
];

export const normalizeFormData = (data = {}) => {
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

export const getMergedFormState = (rawFormData = {}) => {
  const nested = rawFormData?.formData || {};
  return {
    ...rawFormData,
    ...nested,
    individuals: nested.individuals ?? rawFormData.individuals ?? [],
  };
};

export const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined;

  return path.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    const isIndex = !Number.isNaN(Number(key));
    return isIndex ? acc[Number(key)] : acc[key];
  }, obj);
};

export const isEmptyValue = (value) => {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  );
};

export const unwrapFile = (value) => {
  if (!value) return null;
  if (value instanceof File) return value;
  if (value?.file instanceof File) return value.file;
  return null;
};
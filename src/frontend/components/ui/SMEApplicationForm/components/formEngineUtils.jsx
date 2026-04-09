//Util functions for form
export const buildEmptyRow = (fieldsConfig = {}) => {
  const row = {};

  Object.entries(fieldsConfig).forEach(([key, cfg]) => {
    if (cfg?.value !== undefined) {
      row[key] = cfg.value;
    } else if (cfg?.type === "checkbox") {
      row[key] = [];
    } else {
      row[key] = "";
    }
  });

  return row;
};

export const getRowsFromStorage = (formData, storageKey) => {
  return formData?.[storageKey] || [];
};

export const updateRowField = (rows, rowIndex, fieldKey, value) => {
  return rows.map((row, index) =>
    index === rowIndex ? { ...row, [fieldKey]: value } : row,
  );
};
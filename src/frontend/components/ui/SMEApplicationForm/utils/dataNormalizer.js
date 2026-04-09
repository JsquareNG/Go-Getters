
export const snakeToCamelDeep = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamelDeep);
  }

  if (obj !== null && typeof obj === "object") {
    const newObj = {};

    Object.keys(obj).forEach((key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      newObj[camelKey] = snakeToCamelDeep(obj[key]);
    });

    return newObj;
  }

  return obj;
};
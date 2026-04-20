export const generateDocKey = (doc) =>
  doc
    .toLowerCase()
    .replace(/[^\w]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");

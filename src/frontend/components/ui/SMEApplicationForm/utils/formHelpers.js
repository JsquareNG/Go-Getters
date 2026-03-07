// Utility function to generate document keys from document names -> to standardize how we access document fields in SME application form data and API payloads
export const generateDocKey = (doc) =>
  doc
    .toLowerCase()
    .replace(/[^\w]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");

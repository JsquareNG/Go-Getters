import axiosClient from "./axiosClient";

export const generateManualReviewSuggestions = async (payload) => {
  const response = await axiosClient.post(
    "/manual-review-ai/generate",
    payload
  );
  return response.data;
};

export const generateAlternativeDocumentOptions = async (payload) => {
  const response = await axiosClient.post(
    "/manual-review-ai/alternative-documents",
    payload
  );
  return response.data;
};
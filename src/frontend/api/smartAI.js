import axiosClient from "./axiosClient";

export const generateManualReviewSuggestions = async (payload) => {
  const response = await axiosClient.post(
    "http://127.0.0.1:8000/manual-review-ai/generate",
    payload
  );
  return response.data;
};

import axiosClient from "./axiosClient";

export const getRiskRulesByCategory = async (category) => {
  const res = await axiosClient.get(`/risk-rules/byCategory/${category}`);
  return res.data;
};

export const saveRiskRuleChanges = async (payload) => {
  const res = await axiosClient.put("/risk-rules/saveChanges", payload);
  return res.data;
};

export const getBasicComplianceCategories = async () => {
  const res = await axiosClient.get("/risk-rules/categories");
  return res.data.categories || [];
};

export const getRuleFieldOptions = async (category) => {
  const response = await axiosClient.get(`/risk-rules/field-options/${category}`);
  return response.data;
};

export const getAllRules = async () => {
  const res = await axiosClient.get("/risk-rules/");
  return res.data;
};
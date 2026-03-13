import axiosClient from "./axiosClient";

export const getRiskRulesByCategory = async (category) => {
  const res = await axiosClient.get(`/risk-rules/byCategory/${category}`);
  return res.data;
};

export const saveRiskRuleChanges = async (payload) => {
  const res = await axiosClient.put("/risk-rules/saveChanges", payload);
  return res.data;
};
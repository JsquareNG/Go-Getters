import axiosClient from "./axiosClient";

export const getRiskConfigListByListName = async (listName) => {
  const res = await axiosClient.get(`/risk-config-list/byListName/${listName}`);
  return res.data;
};

export const saveRiskConfigListChanges = async (payload) => {
  const res = await axiosClient.put(`/risk-config-list/save-changes`, payload);
  return res.data;
};
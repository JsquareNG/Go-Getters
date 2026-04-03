import axiosClient from "./axiosClient";

export const getRiskConfigListByListName = async (listName) => {
  const res = await axiosClient.get(`/risk-config-list/byListName/${listName}`);
  return res.data;
};

export const saveRiskConfigListChanges = async (payload) => {
  const res = await axiosClient.put(`/risk-config-list/save-changes`, payload);
  return res.data;
};

export const getRiskConfigListNames = async () => {
  const response = await axiosClient.get("/risk-config-list/list-names");
  return response.data;
};

export const getAllRiskConfigListNames = async () => {
  const response = await axiosClient.get("/risk-config-list/all-list-names");
  return response.data;
};

export const getThreshold = async (itemLabel) => {
  const response = await axiosClient.get(
    `/risk-config-list/threshold/${encodeURIComponent(itemLabel)}`
  );
  return response.data;
};
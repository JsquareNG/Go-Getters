import axiosClient from "./axiosClient";

export const livenessDetectionApi = async (payload) => {
  const res = await axiosClient.post("/liveness-detection/createDetection", payload);
  return res.data;
};

export const getKYCdetails = async (appId) => {
  // Using the specific endpoint you provided
  const res = await axiosClient.get(`/liveness-detection/byApplicationID/${appId}`);
  return res.data;
};

export const getAllLivenessDetections = async (params = {}) => {
  const res = await axiosClient.get(`/liveness-detection/`, {
    params,
  });
  return res.data;
};
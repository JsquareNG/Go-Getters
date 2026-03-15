import axiosClient from "./axiosClient";

export const livenessDetectionApi = async (payload) => {
  const res = await axiosClient.post("/liveness-detection/createDetection", payload);
  return res.data;
};
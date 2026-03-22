import axiosClient from "./axiosClient";

export const getAuditTrail = async (appId) => {
  const res = await axiosClient.get(`/audit-trail/getAuditTrails/${appId}`);
  return res.data;
};

export const getAuditMetricsOverview = async () => {
  const res = await axiosClient.get("/audit-trail/metrics/overview");
  return res.data;
};

export const getStaffLeaderboard = async () => {
  const res = await axiosClient.get("/audit-trail/metrics/staff-leaderboard");
  return res.data;
};
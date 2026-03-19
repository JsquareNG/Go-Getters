import { current } from "@reduxjs/toolkit";
import axiosClient from "./axiosClient";

export const getAuditTrail = async (appId) => {
  // Using the specific endpoint you provided
  const res = await axiosClient.get(`/audit-trail/getAuditTrails/${appId}`);
  return res.data;
};
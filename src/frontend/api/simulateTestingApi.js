import axiosClient from "./axiosClient";

export const getSubmittedApplications = async () => {
  const res = await axiosClient.get(`/applications/getSimulationApplications`);
  return res.data;
};

export async function runSimulation(applications) {
  const response = await axiosClient.post("/simulation-testing/run", {
    applications,
  });
  return response.data;
}
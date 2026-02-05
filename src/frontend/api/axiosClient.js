import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://go-getters-onboarding.onrender.com", // FastAPI URL
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;

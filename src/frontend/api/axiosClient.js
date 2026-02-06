import axios from "axios";
import { store } from "../store/store";
import { logout } from "../store/authSlice";

const axiosClient = axios.create({
  baseURL: "http://127.0.0.1:8000", // FastAPI URL
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;


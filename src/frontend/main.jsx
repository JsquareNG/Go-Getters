import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import HomeLayout from "./layouts/HomeLayout";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <HomeLayout>
              <Home />
            </HomeLayout>
          }
        />
        <Route path="/landingpage" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

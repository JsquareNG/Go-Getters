import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import HomeLayout from "./layouts/HomeLayout";
import LandingLayout from "./layouts/LandingLayout";
import AccountsPage from "./pages/AccountsPage";
import NewApplication from "./pages/NewApplication";
import ApplicationDetail from "./pages/ApplicationDetail"; // ✅ ADD THIS

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route
          path="/"
          element={
            <HomeLayout>
              <Home />
            </HomeLayout>
          }
        />

        {/* Landing dashboard */}
        <Route
          path="/landingpage"
          element={
            <LandingLayout>
              <LandingPage />
            </LandingLayout>
          }
        />

        {/* Create new application */}
        <Route
          path="/landingpage/newapplication"
          element={
            <LandingLayout>
              <NewApplication />
            </LandingLayout>
          }
        />

        {/* Application detail (Take Action / Continue) */}
        <Route
          path="/landingpage/:id"
          element={
            <LandingLayout>
              <ApplicationDetail />
            </LandingLayout>
          }
        />

        {/* Accounts */}
        <Route
          path="/accountspage"
          element={
            <LandingLayout>
              <AccountsPage />
            </LandingLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

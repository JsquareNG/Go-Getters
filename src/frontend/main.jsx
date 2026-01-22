import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import HomeLayout from "./layouts/HomeLayout";
import LandingLayout from "./layouts/LandingLayout";
import AccountsPage from "./pages/AccountsPage";
import NewApplication from "./pages/NewApplication";
import ApplicationDetail from "./pages/ApplicationDetail";
import StaffLandingPage from "./pages/StaffLandingPage";
import ApplicationReviewDetail from "./pages/ApplicationReviewDetail";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "./components/ui/toaster";

// Simple route guard
const RequireRole = ({ role, children }) => {
  const authUser = JSON.parse(localStorage.getItem("authUser") || "null");
  if (!authUser) return <Navigate to="/" replace />;
  if (authUser.role !== role) return <Navigate to="/" replace />;
  return children;
};

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

        {/* Register */}
        <Route path="/register" element={<Home />} />

        {/* SME routes */}
        <Route
          path="/landingpage"
          element={
            <RequireRole role="sme">
              <LandingLayout>
                <LandingPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/landingpage/newapplication"
          element={
            <RequireRole role="sme">
              <LandingLayout>
                <NewApplication />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/landingpage/:id"
          element={
            <RequireRole role="sme">
              <LandingLayout>
                <ApplicationDetail />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/accountspage"
          element={
            <RequireRole role="sme">
              <LandingLayout>
                <AccountsPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        {/* Staff routes */}
        <Route
          path="/staff-landingpage"
          element={
            <RequireRole role="dbs">
              <LandingLayout>
                <StaffLandingPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/staff-landingpage/:id"
          element={
            <RequireRole role="dbs">
              <LandingLayout>
                <ApplicationReviewDetail />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireRole role="dbs">
              <LandingLayout>
                <Dashboard />
              </LandingLayout>
            </RequireRole>
          }
        />
      </Routes>
    </BrowserRouter>
    <Toaster />
  </React.StrictMode>,
);

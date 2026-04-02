import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import HomeLayout from "./layouts/HomeLayout";
import LandingLayout from "./layouts/LandingLayout";
import ApplicationDetail from "./pages/ApplicationDetail";
import StaffLandingPage from "./pages/StaffLandingPage";
import ApplicationReviewDetail from "./pages/ApplicationReviewDetail";
import Dashboard from "./pages/Dashboard";
import AdminConfigPage from "./pages/AdminConfigPage";
import RulesEngineConfiguration from "./pages/RulesEngineConfiguration";
import ManagementLandingPage from "./pages/ManagementLandingPage";
import ManagementApplicationDetail from "./pages/ApplicationDetailView";
// import TestDocumentMulti from "./pages/TestDocument";
// import ViewSubmittedApplication from "./pages/OneDocument";
import { Toaster } from "./components/ui/primitives/Toaster";

import { useSelector } from "react-redux";
import { selectUser } from "./store/authSlice";
import { Navigate } from "react-router-dom";
import { SMEApplicationForm } from "./components/ui/SMEApplicationForm";

// Simple route guard
const RequireRole = ({ roles, children }) => {
  const user = useSelector(selectUser);

  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

export default function App() {
  return (
    <>
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
            <RequireRole roles={["SME"]}>
              <LandingLayout>
                <LandingPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/landingpage/:id"
          element={
            <RequireRole roles={["SME"]}>
              <LandingLayout>
                <ApplicationDetail />
              </LandingLayout>
            </RequireRole>
          }
        />

        {/* SME application form - edit/view mode routing */}
        <Route
          path="/application/edit/:appId/:step"
          element={
            <RequireRole roles={["SME"]}>
              <LandingLayout>
                <SMEApplicationForm />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/application/view/:appId/:step"
          element={
            <RequireRole roles={["SME"]}>
              <LandingLayout>
                <SMEApplicationForm />
              </LandingLayout>
            </RequireRole>
          }
        />

        {/* Staff routes */}
        <Route
          path="/staff-landingpage"
          element={
            <RequireRole roles={["STAFF"]}>
              <LandingLayout>
                <StaffLandingPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/staff-landingpage/:id"
          element={
            <RequireRole roles={["STAFF"]}>
              <LandingLayout>
                <ApplicationReviewDetail />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireRole roles={["STAFF","MANAGEMENT"]}>
              <LandingLayout>
                <Dashboard />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/rules-engine-configuration"
          element={
            <RequireRole roles={["MANAGEMENT"]}>
              <LandingLayout>
                <RulesEngineConfiguration />
              </LandingLayout>
            </RequireRole>
          }
        />
        <Route
          path="/management-landing-page"
          element={
            <RequireRole roles={["MANAGEMENT"]}>
              <LandingLayout>
                <ManagementLandingPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/management-landing-page/:id"
          element={
            <RequireRole roles={["MANAGEMENT"]}>
              <LandingLayout>
                <ManagementApplicationDetail/>
              </LandingLayout>
            </RequireRole>
          }
        />
      </Routes>

      {/* global toaster */}
      <Toaster />
    </>
  );
}

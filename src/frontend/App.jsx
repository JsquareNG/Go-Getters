import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import HomeLayout from "./layouts/HomeLayout";
import LandingLayout from "./layouts/LandingLayout";
import AccountsPage from "./pages/AccountsPage";
import ApplicationDetail from "./pages/ApplicationDetail";
import StaffLandingPage from "./pages/StaffLandingPage";
import ApplicationReviewDetail from "./pages/ApplicationReviewDetail";
import Dashboard from "./pages/Dashboard";
import TestDocumentMulti from "./pages/TestDocument";
import ViewSubmittedApplication from "./pages/OneDocument";
import { Toaster } from "./components/ui/toaster";


import { useSelector } from "react-redux";
import { selectUser } from "./store/authSlice";
import { Navigate } from "react-router-dom";
import { SMEApplicationForm } from "./components/ui/SMEApplicationForm";


// Simple route guard
const RequireRole = ({ role, children }) => {
  const user = useSelector(selectUser);
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
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
            <RequireRole role="SME">
              <LandingLayout>
                <LandingPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/landingpage/:id"
          element={
            <RequireRole role="SME">
              <LandingLayout>
                <ApplicationDetail />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/accountspage"
          element={
            <RequireRole role="SME">
              <LandingLayout>
                <AccountsPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/applications/form"
          element={
            <RequireRole role="SME">
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
            <RequireRole role="STAFF">
              <LandingLayout>
                <StaffLandingPage />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/staff-landingpage/:id"
          element={
            <RequireRole role="STAFF">
              <LandingLayout>
                <ApplicationReviewDetail />
              </LandingLayout>
            </RequireRole>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireRole role="STAFF">
              <LandingLayout>
                <Dashboard />
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

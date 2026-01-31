import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import HomeLayout from "./layouts/HomeLayout";
import LandingLayout from "./layouts/LandingLayout"
import TestDocument from "./pages/TestDocument"   // ✅ add this
import OneDocument from "./pages/OneDocument";

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
        <Route
          path="/landingpage"
          element={
            <LandingLayout>
              <LandingPage />
            </LandingLayout>
          }
        />
         <Route
          path="/testdocument"
          element={
            <HomeLayout>
              <TestDocument />
            </HomeLayout>
          }
        />
        <Route
          path="/OneDocument"
          element={
            <HomeLayout>
              <OneDocument />
            </HomeLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

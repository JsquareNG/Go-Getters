import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { BrowserRouter } from "react-router-dom";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/store";
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
import TestDocumentMulti from "./pages/TestDocument";
import ViewSubmittedApplication from "./pages/OneDocument";
import { Toaster } from "./components/ui/toaster";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

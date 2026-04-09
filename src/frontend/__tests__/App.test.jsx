import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

// Mock react-redux
vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useSelector: vi.fn(),
  };
});

// Mock page components
vi.mock("../pages/Home", () => ({
  default: () => <div>Home Page</div>,
}));

vi.mock("../pages/LandingPage", () => ({
  default: () => <div>Landing Page</div>,
}));

vi.mock("../pages/ApplicationDetail", () => ({
  default: () => <div>Application Detail Page</div>,
}));

vi.mock("../pages/StaffLandingPage", () => ({
  default: () => <div>Staff Landing Page</div>,
}));

vi.mock("../pages/ApplicationReviewDetail", () => ({
  default: () => <div>Application Review Detail Page</div>,
}));

vi.mock("../pages/Dashboard", () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock("../pages/AdminConfigPage", () => ({
  default: () => <div>Admin Config Page</div>,
}));

vi.mock("../pages/RulesEngineConfiguration", () => ({
  default: () => <div>Rules Engine Configuration Page</div>,
}));

// Mock layouts
vi.mock("../layouts/HomeLayout", () => ({
  default: ({ children }) => <div data-testid="home-layout">{children}</div>,
}));

vi.mock("../layouts/LandingLayout", () => ({
  default: ({ children }) => <div data-testid="landing-layout">{children}</div>,
}));

// Mock toaster
vi.mock("../components/ui/primitives/Toaster", () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

// Mock SME application form
vi.mock("../components/ui/SMEApplicationForm", () => ({
  SMEApplicationForm: () => <div>SME Application Form</div>,
}));

import { useSelector } from "react-redux";

describe("App", () => {
  it("renders home route without crashing", () => {
    useSelector.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Home Page")).toBeInTheDocument();
    expect(screen.getByTestId("home-layout")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("redirects protected SME route when no user", () => {
    useSelector.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={["/landingpage"]}>
        <App />
      </MemoryRouter>
    );

    // redirected back to home route
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  it("renders SME landing page when SME user exists", () => {
    useSelector.mockReturnValue({ role: "SME" });

    render(
      <MemoryRouter initialEntries={["/landingpage"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.getByTestId("landing-layout")).toBeInTheDocument();
  });

  it("renders staff dashboard when STAFF user exists", () => {
    useSelector.mockReturnValue({ role: "STAFF" });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.getByTestId("landing-layout")).toBeInTheDocument();
  });
});
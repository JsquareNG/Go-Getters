import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LandingNavBar } from "../components/ui/features/LandingNavBar"; // adjust if needed

let mockUser = null;

// Router mock
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Redux mocks
vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useDispatch: () => vi.fn(),
    useSelector: (selector) => selector(),
  };
});

// Partial mock for authSlice
vi.mock("@/store/authSlice", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    selectUser: () => mockUser,
    logout: () => ({ type: "auth/logout" }),
  };
});

// Mock notifications API just so component doesn't crash
vi.mock("../src/api/notificationsApi", () => ({
  getAllNotifications: vi.fn().mockResolvedValue({ notifications: [], unread: 0 }),
  getUnreadNotifications: vi.fn().mockResolvedValue({ total: 0 }),
  readOneApplication: vi.fn().mockResolvedValue({}),
  readAllApplication: vi.fn().mockResolvedValue({}),
}));

// Mock logo import
vi.mock("@/assets/gogetterslogo.png", () => ({
  default: "mock-logo.png",
}));

function renderNav() {
  return render(
    <MemoryRouter>
      <LandingNavBar />
    </MemoryRouter>
  );
}

describe("LandingNavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders SME navigation items for SME user", async () => {
    mockUser = {
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    };

    renderNav();

    expect(await screen.findByText(/applications/i)).toBeInTheDocument();
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/staff landing/i)).not.toBeInTheDocument();
  });

  it("renders STAFF navigation items for STAFF user", async () => {
    mockUser = {
      role: "STAFF",
      user_id: "S1",
      first_name: "Alice",
      last_name: "Lim",
    };

    renderNav();

    expect(await screen.findByText(/staff landing/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/rules engine configuration/i)).toBeInTheDocument();
    expect(screen.queryByText(/^applications$/i)).not.toBeInTheDocument();
  });

  it("shows user initials and name", async () => {
    mockUser = {
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    };

    renderNav();

    expect(await screen.findByText(/jane tan/i)).toBeInTheDocument();
    expect(screen.getByText("JT")).toBeInTheDocument();
  });

  it("shows notification button", async () => {
    mockUser = {
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    };

    renderNav();

    expect(await screen.findByLabelText(/notifications/i)).toBeInTheDocument();
  });
});
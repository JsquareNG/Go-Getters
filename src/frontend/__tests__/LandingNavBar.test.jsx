import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LandingNavBar } from "../components/ui/navigation/LandingNavBar"; // adjust if needed

// ----------------------------
// Shared mock state
// ----------------------------
let mockUser = null;

// ----------------------------
// Router mocks
// ----------------------------
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ----------------------------
// Redux mocks
// ----------------------------
const mockDispatch = vi.fn();

vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector) => selector(),
  };
});

// IMPORTANT: partial mock so default export stays intact
vi.mock("@/store/authSlice", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    selectUser: () => mockUser,
    logout: () => ({ type: "auth/logout" }),
  };
});

// ----------------------------
// Notifications API mocks
// Path must match component import EXACTLY
// ----------------------------
const mockGetAllNotifications = vi.fn();
const mockGetUnreadNotifications = vi.fn();
const mockReadOneApplication = vi.fn();
const mockReadAllApplication = vi.fn();

vi.mock("../../../api/notificationsApi", () => ({
  getAllNotifications: (...args) => mockGetAllNotifications(...args),
  getUnreadNotifications: (...args) => mockGetUnreadNotifications(...args),
  readOneApplication: (...args) => mockReadOneApplication(...args),
  readAllApplication: (...args) => mockReadAllApplication(...args),
}));

// ----------------------------
// Asset mock
// ----------------------------
vi.mock("@/assets/gogetterslogo.png", () => ({
  default: "mock-logo.png",
}));

// ----------------------------
// Render helper
// ----------------------------
function renderNav() {
  return render(
    <MemoryRouter>
      <LandingNavBar />
    </MemoryRouter>
  );
}

// ----------------------------
// Tests
// ----------------------------
describe("LandingNavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;

    mockGetUnreadNotifications.mockResolvedValue({ total: 0 });
    mockGetAllNotifications.mockResolvedValue({ notifications: [], unread: 0 });
    mockReadOneApplication.mockResolvedValue({});
    mockReadAllApplication.mockResolvedValue({});
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

  it("fetches notifications on mount", async () => {
    mockUser = {
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    };

    renderNav();

    await waitFor(() => {
      expect(mockGetUnreadNotifications).toHaveBeenCalledWith("U1");
      expect(mockGetAllNotifications).toHaveBeenCalledWith("U1");
    });
  });

  it("shows unread badge when unread count is positive", async () => {
    mockUser = {
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    };

    mockGetUnreadNotifications.mockResolvedValue({ total: 3 });

    renderNav();

    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("dispatches logout and navigates home when logout clicked", async () => {
    mockUser = {
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    };

    renderNav();

    fireEvent.click(await screen.findByText(/jane tan/i));
    fireEvent.click(await screen.findByText(/logout/i));

    expect(mockDispatch).toHaveBeenCalledWith({ type: "auth/logout" });
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
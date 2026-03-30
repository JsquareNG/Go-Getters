import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LandingNavBar } from "../components/ui/features/LandingNavBar";

// Mock router
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock redux
const mockDispatch = vi.fn();
const mockUseSelector = vi.fn();

vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector) => mockUseSelector(selector),
  };
});

// Mock authSlice
vi.mock("@/store/authSlice", () => ({
  selectUser: (state) => state,
  logout: () => ({ type: "auth/logout" }),
}));

// Mock notification APIs
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

// Mock image import
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

    mockGetUnreadNotifications.mockResolvedValue({ total: 0 });
    mockGetAllNotifications.mockResolvedValue({ notifications: [], unread: 0 });
  });

  it("renders SME navigation items for SME user", async () => {
    mockUseSelector.mockReturnValue({
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    });

    renderNav();

    expect(await screen.findByText(/applications/i)).toBeInTheDocument();
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
  });

  it("renders STAFF navigation items for STAFF user", async () => {
    mockUseSelector.mockReturnValue({
      role: "STAFF",
      user_id: "S1",
      first_name: "Alice",
      last_name: "Lim",
    });

    renderNav();

    expect(await screen.findByText(/staff landing/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/applications/i)).not.toBeInTheDocument();
  });

  it("shows user initials and full name", async () => {
    mockUseSelector.mockReturnValue({
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    });

    renderNav();

    expect(await screen.findByText(/jane tan/i)).toBeInTheDocument();
    expect(screen.getByText("JT")).toBeInTheDocument();
  });

  it("shows notification button", async () => {
    mockUseSelector.mockReturnValue({
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    });

    renderNav();

    expect(await screen.findByLabelText(/notifications/i)).toBeInTheDocument();
  });

  it("fetches notifications on mount", async () => {
    mockUseSelector.mockReturnValue({
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    });

    renderNav();

    await waitFor(() => {
      expect(mockGetUnreadNotifications).toHaveBeenCalledWith("U1");
      expect(mockGetAllNotifications).toHaveBeenCalledWith("U1");
    });
  });

  it("shows unread badge when unread count is positive", async () => {
    mockUseSelector.mockReturnValue({
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    });

    mockGetUnreadNotifications.mockResolvedValue({ total: 3 });

    renderNav();

    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("dispatches logout and navigates home when logout clicked", async () => {
    mockUseSelector.mockReturnValue({
      role: "SME",
      user_id: "U1",
      first_name: "Jane",
      last_name: "Tan",
    });

    renderNav();

    // open dropdown
    fireEvent.click(await screen.findByText(/jane tan/i));

    const logoutBtn = await screen.findByText(/logout/i);
    fireEvent.click(logoutBtn);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "auth/logout" });
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
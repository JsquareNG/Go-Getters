import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

// Replace with your actual import
import ApplicationDetail from "../pages/ApplicationDetail";

describe("ApplicationDetail", () => {
  it("shows overview tab by default", () => {
    render(<ApplicationDetail showActionRequired={false} />);

    expect(screen.getByText(/overview/i)).toBeInTheDocument();
  });

  it("switches to response tab when action required", () => {
    render(<ApplicationDetail showActionRequired={true} actionReason="Missing doc" />);

    expect(screen.getByText(/response/i)).toBeInTheDocument();
  });
});
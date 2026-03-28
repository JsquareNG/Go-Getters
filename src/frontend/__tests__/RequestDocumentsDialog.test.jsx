import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Replace with your actual import
import RequestDocumentsDialog from "../components/ui/features/RequestDocumentsDialog";

describe("RequestDocumentsDialog", () => {
  it("shows error when reason is empty", () => {
    render(
      <RequestDocumentsDialog
        open={true}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText(/reason/i)).toBeInTheDocument();
  });

  it("shows error when no documents and questions", () => {
    render(
      <RequestDocumentsDialog
        open={true}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/reason/i), {
      target: { value: "Need more info" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText(/at least one/i)).toBeInTheDocument();
  });

  it("calls onSubmit when valid input", () => {
    const mockSubmit = vi.fn();

    render(
      <RequestDocumentsDialog
        open={true}
        onClose={() => {}}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/reason/i), {
      target: { value: "Need docs" },
    });

    // simulate adding document
    fireEvent.click(screen.getByText(/add document/i));

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(mockSubmit).toHaveBeenCalled();
  });
});
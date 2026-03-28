import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Replace with your actual import
import ResubmitDialog from "../components/ResubmitDialog";

describe("ResubmitDialog", () => {
  it("shows error when required document missing", () => {
    render(
      <ResubmitDialog
        open={true}
        requiredDocuments={[{ item_id: "1", document_name: "ACRA" }]}
        requiredQuestions={[]}
        onSubmit={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it("shows error when required question missing", () => {
    render(
      <ResubmitDialog
        open={true}
        requiredDocuments={[]}
        requiredQuestions={[{ item_id: "q1", question_text: "Explain" }]}
        onSubmit={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it("submits when all requirements fulfilled", () => {
    const mockSubmit = vi.fn();

    render(
      <ResubmitDialog
        open={true}
        requiredDocuments={[]}
        requiredQuestions={[]}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalled();
  });
});
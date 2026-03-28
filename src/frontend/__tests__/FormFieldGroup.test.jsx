import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Replace with your actual import
import FormFieldGroup from "../components/ui/SMEApplicationForm/components/FormFieldGroup";

describe("FormFieldGroup", () => {
  it("renders label and value", () => {
    render(
      <FormFieldGroup
        label="Name"
        value="John"
        onChange={() => {}}
      />
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
  });

  it("calls onChange when input changes", () => {
    const mockChange = vi.fn();

    render(
      <FormFieldGroup
        label="Name"
        value=""
        onChange={mockChange}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Alice" },
    });

    expect(mockChange).toHaveBeenCalled();
  });
});
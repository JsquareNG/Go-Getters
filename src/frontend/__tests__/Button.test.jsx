import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "../components/ui/primitives/Button"; // adjust path if needed

describe("Button", () => {
  it("renders button text", () => {
    render(<Button>Click Me</Button>);

    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: /delete/i });
    expect(button.className).toContain("bg-destructive");
  });

  it("applies size classes", () => {
    render(<Button size="lg">Large Button</Button>);

    const button = screen.getByRole("button", { name: /large button/i });
    expect(button.className).toContain("h-11");
  });

  it("renders as child when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Go Link</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: /go link/i });
    expect(link).toBeInTheDocument();
  });
});
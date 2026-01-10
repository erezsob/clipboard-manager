import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
	const mockOnDismiss = vi.fn();

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders error message", () => {
		render(
			<ErrorBanner message="Something went wrong" onDismiss={mockOnDismiss} />,
		);

		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
	});

	it("renders dismiss button", () => {
		render(<ErrorBanner message="Error message" onDismiss={mockOnDismiss} />);

		expect(
			screen.getByRole("button", { name: "Dismiss error" }),
		).toBeInTheDocument();
	});

	it("calls onDismiss when dismiss button is clicked", () => {
		render(<ErrorBanner message="Error message" onDismiss={mockOnDismiss} />);

		const dismissButton = screen.getByRole("button", { name: "Dismiss error" });
		fireEvent.click(dismissButton);

		expect(mockOnDismiss).toHaveBeenCalled();
	});

	it("displays different error messages", () => {
		const { rerender } = render(
			<ErrorBanner message="First error" onDismiss={mockOnDismiss} />,
		);

		expect(screen.getByText("First error")).toBeInTheDocument();

		rerender(<ErrorBanner message="Second error" onDismiss={mockOnDismiss} />);

		expect(screen.getByText("Second error")).toBeInTheDocument();
		expect(screen.queryByText("First error")).not.toBeInTheDocument();
	});
});

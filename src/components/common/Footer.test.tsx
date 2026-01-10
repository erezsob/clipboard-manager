import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";

describe("Footer", () => {
	const mockSettingsMenuRef = createRef<HTMLDivElement | null>();
	const mockHandlers = {
		onSettingsToggle: vi.fn(),
		onClearAll: vi.fn(),
		onQuit: vi.fn(),
	} as const satisfies Omit<
		ComponentProps<typeof Footer>,
		"isSettingsMenuOpen" | "settingsMenuRef"
	>;

	const defaultProps = {
		isSettingsMenuOpen: false,
		settingsMenuRef: mockSettingsMenuRef,
		...mockHandlers,
	} as const satisfies ComponentProps<typeof Footer>;

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders keyboard hints", () => {
		render(<Footer {...defaultProps} />);

		expect(screen.getByText(/↑↓ Navigate/)).toBeInTheDocument();
		expect(screen.getByText(/Enter Copy/)).toBeInTheDocument();
		expect(screen.getByText(/Esc Close/)).toBeInTheDocument();
	});

	it("renders settings button", () => {
		render(<Footer {...defaultProps} />);

		expect(
			screen.getByRole("button", { name: "Settings" }),
		).toBeInTheDocument();
	});

	it("calls onSettingsToggle when settings button is clicked", () => {
		render(<Footer {...defaultProps} />);

		const settingsButton = screen.getByRole("button", { name: "Settings" });
		fireEvent.click(settingsButton);

		expect(mockHandlers.onSettingsToggle).toHaveBeenCalled();
	});

	it("shows settings menu when isSettingsMenuOpen is true", () => {
		render(<Footer {...defaultProps} isSettingsMenuOpen={true} />);

		expect(screen.getByRole("menu")).toBeInTheDocument();
		expect(
			screen.getByRole("menuitem", { name: /Clear All/ }),
		).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Quit" })).toBeInTheDocument();
	});

	it("hides settings menu when isSettingsMenuOpen is false", () => {
		render(<Footer {...defaultProps} isSettingsMenuOpen={false} />);

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("calls onClearAll when Clear All menu item is clicked", () => {
		render(<Footer {...defaultProps} isSettingsMenuOpen={true} />);

		const clearAllButton = screen.getByRole("menuitem", { name: /Clear All/ });
		fireEvent.click(clearAllButton);

		expect(mockHandlers.onClearAll).toHaveBeenCalled();
	});

	it("calls onQuit when Quit menu item is clicked", () => {
		render(<Footer {...defaultProps} isSettingsMenuOpen={true} />);

		const quitButton = screen.getByRole("menuitem", { name: "Quit" });
		fireEvent.click(quitButton);

		expect(mockHandlers.onQuit).toHaveBeenCalled();
	});

	it("settings button has correct aria-expanded attribute", () => {
		const { rerender } = render(
			<Footer {...defaultProps} isSettingsMenuOpen={false} />,
		);

		const settingsButton = screen.getByRole("button", { name: "Settings" });
		expect(settingsButton).toHaveAttribute("aria-expanded", "false");

		rerender(<Footer {...defaultProps} isSettingsMenuOpen={true} />);

		expect(settingsButton).toHaveAttribute("aria-expanded", "true");
	});
});

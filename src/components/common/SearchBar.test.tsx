import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
	const mockInputRef = createRef<HTMLInputElement | null>();
	const mockHandlers = {
		onSearchChange: vi.fn(),
		onFavoritesToggle: vi.fn(),
	};

	const defaultProps = {
		inputRef: mockInputRef,
		searchQuery: "",
		favoritesOnly: false,
		...mockHandlers,
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders search input", () => {
		render(<SearchBar {...defaultProps} />);

		expect(
			screen.getByPlaceholderText("Search clipboard history..."),
		).toBeInTheDocument();
	});

	it("displays current search query value", () => {
		render(<SearchBar {...defaultProps} searchQuery="test query" />);

		const input = screen.getByPlaceholderText("Search clipboard history...");
		expect(input).toHaveValue("test query");
	});

	it("calls onSearchChange when typing", () => {
		render(<SearchBar {...defaultProps} />);

		const input = screen.getByPlaceholderText("Search clipboard history...");
		fireEvent.change(input, { target: { value: "hello" } });

		expect(mockHandlers.onSearchChange).toHaveBeenCalledWith("hello");
	});

	it("shows clear button when search query exists", () => {
		render(<SearchBar {...defaultProps} searchQuery="test" />);

		expect(
			screen.getByRole("button", { name: "Clear search" }),
		).toBeInTheDocument();
	});

	it("does not show clear button when search query is empty", () => {
		render(<SearchBar {...defaultProps} searchQuery="" />);

		expect(
			screen.queryByRole("button", { name: "Clear search" }),
		).not.toBeInTheDocument();
	});

	it("calls onSearchChange with empty string when clear button is clicked", () => {
		render(<SearchBar {...defaultProps} searchQuery="test" />);

		const clearButton = screen.getByRole("button", { name: "Clear search" });
		fireEvent.click(clearButton);

		expect(mockHandlers.onSearchChange).toHaveBeenCalledWith("");
	});

	it("shows favorites filter toggle", () => {
		render(<SearchBar {...defaultProps} />);

		expect(
			screen.getByRole("button", { name: "Show favorites only" }),
		).toBeInTheDocument();
	});

	it("calls onFavoritesToggle when favorites button is clicked", () => {
		render(<SearchBar {...defaultProps} />);

		const favoritesButton = screen.getByRole("button", {
			name: "Show favorites only",
		});
		fireEvent.click(favoritesButton);

		expect(mockHandlers.onFavoritesToggle).toHaveBeenCalled();
	});

	it("shows correct aria-label when favorites filter is active", () => {
		render(<SearchBar {...defaultProps} favoritesOnly={true} />);

		expect(
			screen.getByRole("button", { name: "Show all items" }),
		).toBeInTheDocument();
	});

	it("has aria-pressed true when favoritesOnly is true", () => {
		render(<SearchBar {...defaultProps} favoritesOnly={true} />);

		const favoritesButton = screen.getByRole("button", {
			name: "Show all items",
		});
		expect(favoritesButton).toHaveAttribute("aria-pressed", "true");
	});

	it("has aria-pressed false when favoritesOnly is false", () => {
		render(<SearchBar {...defaultProps} favoritesOnly={false} />);

		const favoritesButton = screen.getByRole("button", {
			name: "Show favorites only",
		});
		expect(favoritesButton).toHaveAttribute("aria-pressed", "false");
	});

	it("allows focus via ref for keyboard navigation", () => {
		render(<SearchBar {...defaultProps} />);

		// The ref should allow programmatic focus (the actual use case)
		const input = screen.getByPlaceholderText("Search clipboard history...");
		mockInputRef.current?.focus();
		expect(document.activeElement).toBe(input);
	});
});

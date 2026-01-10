import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockHistoryItem } from "../../test/mocks/history";
import { HistoryItem } from "./HistoryItem";

describe("HistoryItem", () => {
	const mockItem = createMockHistoryItem({
		id: 1,
		content: "Test clipboard content",
		type: "text",
		created_at: new Date().toISOString(),
		is_favorite: 0,
	});

	const mockHandlers = {
		onItemClick: vi.fn(),
		onToggleFavorite: vi.fn(),
		onDelete: vi.fn(),
	} as const satisfies Omit<
		ComponentProps<typeof HistoryItem>,
		"item" | "isSelected"
	>;

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders content correctly", () => {
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		expect(screen.getByText("Test clipboard content")).toBeInTheDocument();
	});

	it("truncates long content", () => {
		const longContent = "a".repeat(150);
		const itemWithLongContent = createMockHistoryItem({
			content: longContent,
		});

		render(
			<HistoryItem
				item={itemWithLongContent}
				isSelected={false}
				{...mockHandlers}
			/>,
		);

		// Content should be truncated (100 chars + "...")
		const displayedText = screen.getByText(/^a+\.\.\.$/);
		expect(displayedText).toBeInTheDocument();
	});

	it("renders formatted date", () => {
		// Use fake timers only for this test that needs specific date formatting
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-08T12:00:00.000Z"));

		const itemJustNow = createMockHistoryItem({
			created_at: new Date("2026-01-08T12:00:00.000Z").toISOString(),
		});

		render(
			<HistoryItem item={itemJustNow} isSelected={false} {...mockHandlers} />,
		);

		expect(screen.getByText("Just now")).toBeInTheDocument();

		vi.useRealTimers();
	});

	it("shows favorite star correctly when not favorited", () => {
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const favoriteButton = screen.getByRole("button", {
			name: "Add to favorites",
		});
		expect(favoriteButton).toBeInTheDocument();
	});

	it("shows favorite star correctly when favorited", () => {
		const favoritedItem = createMockHistoryItem({
			is_favorite: 1,
		});

		render(
			<HistoryItem item={favoritedItem} isSelected={false} {...mockHandlers} />,
		);

		const favoriteButton = screen.getByRole("button", {
			name: "Remove from favorites",
		});
		expect(favoriteButton).toBeInTheDocument();
	});

	it("calls onItemClick when item is clicked", async () => {
		const user = userEvent.setup();
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const itemElement = screen.getByRole("button", {
			name: /Test clipboard content/i,
		});
		await user.click(itemElement);

		expect(mockHandlers.onItemClick).toHaveBeenCalledWith(mockItem);
	});

	it("calls onToggleFavorite when star button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const favoriteButton = screen.getByRole("button", {
			name: "Add to favorites",
		});
		await user.click(favoriteButton);

		expect(mockHandlers.onToggleFavorite).toHaveBeenCalledWith(
			expect.any(Object),
			mockItem.id,
		);
	});

	it("calls onDelete when trash button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const deleteButton = screen.getByRole("button", {
			name: "Delete this clipboard item",
		});
		await user.click(deleteButton);

		expect(mockHandlers.onDelete).toHaveBeenCalledWith(
			expect.any(Object),
			mockItem.id,
		);
	});

	it("has aria-current location when isSelected is true", () => {
		render(<HistoryItem item={mockItem} isSelected={true} {...mockHandlers} />);

		const itemElement = screen.getByRole("button", {
			name: /Test clipboard content/i,
		});
		expect(itemElement).toHaveAttribute("aria-current", "location");
	});

	it("does not have aria-current when isSelected is false", () => {
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const itemElement = screen.getByRole("button", {
			name: /Test clipboard content/i,
		});
		expect(itemElement).not.toHaveAttribute("aria-current");
	});

	it("handles Enter key press", async () => {
		const user = userEvent.setup();
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const itemElement = screen.getByRole("button", {
			name: /Test clipboard content/i,
		});
		itemElement.focus();
		await user.keyboard("{Enter}");

		expect(mockHandlers.onItemClick).toHaveBeenCalledWith(mockItem);
	});

	it("handles Space key press", async () => {
		const user = userEvent.setup();
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const itemElement = screen.getByRole("button", {
			name: /Test clipboard content/i,
		});
		itemElement.focus();
		await user.keyboard(" ");

		expect(mockHandlers.onItemClick).toHaveBeenCalledWith(mockItem);
	});

	it("does not call onItemClick for other key presses", async () => {
		const user = userEvent.setup();
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const itemElement = screen.getByRole("button", {
			name: /Test clipboard content/i,
		});
		itemElement.focus();
		await user.keyboard("{Tab}");

		expect(mockHandlers.onItemClick).not.toHaveBeenCalled();
	});

	it("copy button also triggers onItemClick", async () => {
		const user = userEvent.setup();
		render(
			<HistoryItem item={mockItem} isSelected={false} {...mockHandlers} />,
		);

		const copyButton = screen.getByRole("button", {
			name: "Copy to clipboard",
		});
		await user.click(copyButton);

		expect(mockHandlers.onItemClick).toHaveBeenCalledWith(mockItem);
	});
});

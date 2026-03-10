import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, type RefObject, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockHistoryItems } from "../../test/mocks/history";
import { HistoryList } from "./HistoryList";

describe("HistoryList", () => {
	const mockItems = createMockHistoryItems(3);
	// Use a mutable ref object that matches the expected type
	let mockItemRefs: RefObject<(HTMLDivElement | null)[]> = {
		current: [],
	};

	const mockHandlers = {
		onItemClick: vi.fn(),
		onToggleFavorite: vi.fn(),
		onDelete: vi.fn(),
		onLoadMore: vi.fn(),
		onJumpToTop: vi.fn(),
	} as const;

	const defaultProps = {
		items: mockItems,
		searchQuery: "",
		selectedIndex: 0,
		itemRefs: mockItemRefs,
		hasMore: false,
		isLoadingMore: false,
		...mockHandlers,
	} as const satisfies ComponentProps<typeof HistoryList>;

	beforeEach(() => {
		// Create fresh ref for each test
		mockItemRefs = { current: [] };
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders list of items", () => {
		render(<HistoryList {...defaultProps} />);

		expect(screen.getByText("Test content 1")).toBeInTheDocument();
		expect(screen.getByText("Test content 2")).toBeInTheDocument();
		expect(screen.getByText("Test content 3")).toBeInTheDocument();
	});

	it("shows empty state when no items", () => {
		render(<HistoryList {...defaultProps} items={[]} />);

		expect(screen.getByText("No clipboard history found")).toBeInTheDocument();
	});

	it("shows search hint in empty state when search query exists", () => {
		render(
			<HistoryList {...defaultProps} items={[]} searchQuery="test search" />,
		);

		expect(screen.getByText("No clipboard history found")).toBeInTheDocument();
		expect(screen.getByText("Try a different search term")).toBeInTheDocument();
	});

	it("does not show search hint when no search query", () => {
		render(<HistoryList {...defaultProps} items={[]} searchQuery="" />);

		expect(screen.getByText("No clipboard history found")).toBeInTheDocument();
		expect(
			screen.queryByText("Try a different search term"),
		).not.toBeInTheDocument();
	});

	it("marks selected item with aria-current", () => {
		render(<HistoryList {...defaultProps} selectedIndex={1} />);

		// The second item should have aria-current
		const items = screen.getAllByRole("button", { name: /Test content/i });
		expect(items[1]).toHaveAttribute("aria-current", "location");
		expect(items[0]).not.toHaveAttribute("aria-current");
		expect(items[2]).not.toHaveAttribute("aria-current");
	});

	it("shows Load More button when hasMore is true", () => {
		render(<HistoryList {...defaultProps} hasMore={true} />);

		expect(
			screen.getByRole("button", { name: "Load More" }),
		).toBeInTheDocument();
	});

	it("does not show Load More button when hasMore is false", () => {
		render(<HistoryList {...defaultProps} hasMore={false} />);

		expect(
			screen.queryByRole("button", { name: "Load More" }),
		).not.toBeInTheDocument();
	});

	it("calls onLoadMore when Load More button is clicked", () => {
		render(<HistoryList {...defaultProps} hasMore={true} />);

		const loadMoreButton = screen.getByRole("button", { name: "Load More" });
		fireEvent.click(loadMoreButton);

		expect(mockHandlers.onLoadMore).toHaveBeenCalled();
	});

	it("shows loading state on Load More button", () => {
		render(
			<HistoryList {...defaultProps} hasMore={true} isLoadingMore={true} />,
		);

		const loadMoreButton = screen.getByRole("button", { name: "Loading..." });
		expect(loadMoreButton).toBeInTheDocument();
		expect(loadMoreButton).toBeDisabled();
	});

	it("disables Load More button while loading", () => {
		render(
			<HistoryList {...defaultProps} hasMore={true} isLoadingMore={true} />,
		);

		const loadMoreButton = screen.getByRole("button", { name: "Loading..." });
		expect(loadMoreButton).toBeDisabled();
	});

	it("does not show Load More button when items list is empty", () => {
		render(<HistoryList {...defaultProps} items={[]} hasMore={true} />);

		expect(
			screen.queryByRole("button", { name: "Load More" }),
		).not.toBeInTheDocument();
	});

	it("passes correct props to HistoryItem components", () => {
		render(<HistoryList {...defaultProps} />);

		// Click on the first item using getAllByRole to find the item button
		const items = screen.getAllByRole("button", { name: /Test content/i });
		fireEvent.click(items[0]);

		expect(mockHandlers.onItemClick).toHaveBeenCalledWith(mockItems[0]);
	});

	it("populates item refs array", () => {
		// Create a fresh ref for this specific test
		const testRefs: RefObject<(HTMLDivElement | null)[]> = {
			current: [],
		};

		render(<HistoryList {...defaultProps} itemRefs={testRefs} />);

		// After rendering, the refs array should have 3 elements
		const refs = testRefs.current;
		expect(refs).toHaveLength(3);
		expect(refs[0]).toBeInstanceOf(HTMLDivElement);
		expect(refs[1]).toBeInstanceOf(HTMLDivElement);
		expect(refs[2]).toBeInstanceOf(HTMLDivElement);
	});

	describe("jump to top button", () => {
		function renderWithContainerRef() {
			const containerRef = createRef<HTMLDivElement>();
			render(
				<HistoryList {...defaultProps} containerRef={containerRef} />,
			);
			const container = containerRef.current;
			if (!container) throw new Error("Container ref not set");
			return container;
		}

		it("is not visible when list is not scrolled", () => {
			render(<HistoryList {...defaultProps} />);

			expect(
				screen.queryByRole("button", { name: "Jump to top" }),
			).not.toBeInTheDocument();
		});

		it("appears after scrolling past threshold", () => {
			const container = renderWithContainerRef();

			fireEvent.scroll(container, {
				target: { scrollTop: 250 },
			});

			expect(
				screen.getByRole("button", { name: "Jump to top" }),
			).toBeInTheDocument();
		});

		it("hides when scrolled back above threshold", () => {
			const container = renderWithContainerRef();

			fireEvent.scroll(container, {
				target: { scrollTop: 250 },
			});
			expect(
				screen.getByRole("button", { name: "Jump to top" }),
			).toBeInTheDocument();

			fireEvent.scroll(container, {
				target: { scrollTop: 50 },
			});
			expect(
				screen.queryByRole("button", { name: "Jump to top" }),
			).not.toBeInTheDocument();
		});

		it("calls onJumpToTop and scrolls container when clicked", () => {
			const container = renderWithContainerRef();
			container.scrollTo = vi.fn();

			fireEvent.scroll(container, {
				target: { scrollTop: 250 },
			});

			fireEvent.click(
				screen.getByRole("button", { name: "Jump to top" }),
			);

			expect(mockHandlers.onJumpToTop).toHaveBeenCalled();
			expect(container.scrollTo).toHaveBeenCalledWith({
				top: 0,
				behavior: "smooth",
			});
		});
	});
});

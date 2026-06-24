import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { SettingsMenu } from "./SettingsMenu";

describe("SettingsMenu", () => {
	const menuRef = createRef<HTMLDivElement | null>();
	const handlers = {
		onToggle: vi.fn(),
		onLaunchAtLoginToggle: vi.fn(),
		onClearAll: vi.fn(),
		onQuit: vi.fn(),
	};

	it("renders launch at login checkbox when open", () => {
		render(
			<SettingsMenu
				isOpen={true}
				launchAtLogin={true}
				menuRef={menuRef}
				{...handlers}
			/>,
		);

		const launchAtLoginItem = screen.getByRole("menuitemcheckbox", {
			name: "Launch at login",
		});
		expect(launchAtLoginItem).toHaveAttribute("aria-checked", "true");
	});

	it("calls onLaunchAtLoginToggle when launch at login is clicked", () => {
		render(
			<SettingsMenu
				isOpen={true}
				launchAtLogin={false}
				menuRef={menuRef}
				{...handlers}
			/>,
		);

		fireEvent.click(
			screen.getByRole("menuitemcheckbox", { name: "Launch at login" }),
		);

		expect(handlers.onLaunchAtLoginToggle).toHaveBeenCalledTimes(1);
	});
});

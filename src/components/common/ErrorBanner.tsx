import { X } from "lucide-react";

interface ErrorBannerProps {
	/** The error message to display */
	message: string;
	/** Callback when the dismiss button is clicked */
	onDismiss: () => void;
}

/**
 * A dismissible error banner displayed at the top of the screen
 * Used to show error messages to the user with an option to dismiss
 */
export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
	return (
		<div className="sticky top-0 z-20 bg-red-600 text-white px-3 py-2 text-sm flex items-center justify-between">
			<span>{message}</span>
			<button
				type="button"
				onClick={onDismiss}
				className="hover:bg-red-700 rounded p-1"
				aria-label="Dismiss error"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
}

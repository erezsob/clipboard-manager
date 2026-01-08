import { useEffect, useRef } from "react";

/**
 * Hook that tracks the previous value of a variable
 * @param value - The value to track
 * @returns The previous value (undefined on first render)
 */
export function usePrevious<T>(value: T): T | undefined {
	const ref = useRef<T | undefined>(undefined);

	useEffect(() => {
		ref.current = value;
	}, [value]);

	return ref.current;
}

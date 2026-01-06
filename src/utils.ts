export async function waitFor(
	condition: () => boolean,
	maxAttempts = 50,
	baseDelay = 1,
) {
	let attempts = 0;
	while (attempts < maxAttempts) {
		if (condition()) {
			return;
		}
		attempts++;
		// use exponential backoff
		await new Promise((resolve) =>
			setTimeout(resolve, baseDelay * 2 ** attempts),
		);
	}
	throw new Error("Condition not met after waiting");
}

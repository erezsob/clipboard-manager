// ============================================================================
// Result Type - Explicit success/failure handling (Either pattern)
// ============================================================================

/**
 * Represents the outcome of an operation that can either succeed with a value
 * or fail with an error. Prefer this over try/catch for explicit error handling.
 *
 * @template T - The type of the success value
 * @template E - The type of the error (defaults to Error)
 */
export type Result<T, E = Error> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: E };

/**
 * Creates a successful Result containing the given value
 *
 * @example
 * const result = ok(42);
 * // { ok: true, value: 42 }
 */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Creates a failed Result containing the given error
 *
 * @example
 * const result = err(new Error("Something went wrong"));
 * // { ok: false, error: Error("Something went wrong") }
 */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Transforms the value inside a successful Result, leaving errors unchanged
 *
 * @example
 * const result = ok(5);
 * const doubled = mapResult(result, x => x * 2);
 * // { ok: true, value: 10 }
 */
export const mapResult = <T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => U,
): Result<U, E> => (result.ok ? ok(fn(result.value)) : result);

/**
 * Chains Result-returning operations, flattening nested Results
 *
 * @example
 * const parseNumber = (s: string): Result<number, string> =>
 *   isNaN(Number(s)) ? err("Not a number") : ok(Number(s));
 *
 * const result = flatMapResult(ok("42"), parseNumber);
 * // { ok: true, value: 42 }
 */
export const flatMapResult = <T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => Result<U, E>,
): Result<U, E> => (result.ok ? fn(result.value) : result);

/**
 * Pattern matches on a Result, handling both success and failure cases
 *
 * @example
 * const message = matchResult(result, {
 *   ok: (value) => `Success: ${value}`,
 *   err: (error) => `Failed: ${error.message}`,
 * });
 */
export const matchResult = <T, E, U>(
	result: Result<T, E>,
	handlers: { ok: (value: T) => U; err: (error: E) => U },
): U => (result.ok ? handlers.ok(result.value) : handlers.err(result.error));

/**
 * Extracts the value from a Result, throwing if it's an error
 * Use sparingly - prefer matchResult for explicit handling
 *
 * @throws The error if result is not ok
 */
export const unwrapResult = <T, E>(result: Result<T, E>): T => {
	if (result.ok) return result.value;
	throw result.error;
};

/**
 * Extracts the value from a Result, returning a default if it's an error
 *
 * @example
 * const value = getOrElseResult(err("failed"), 0);
 * // 0
 */
export const getOrElseResult = <T, E>(
	result: Result<T, E>,
	defaultValue: T,
): T => (result.ok ? result.value : defaultValue);

/**
 * Wraps a function that might throw into one that returns a Result
 *
 * @example
 * const safeParseJSON = tryCatch(
 *   (str: string) => JSON.parse(str),
 *   (e) => new Error(`Parse failed: ${e}`)
 * );
 */
export const tryCatch = <T, E>(
	fn: () => T,
	onError: (error: unknown) => E,
): Result<T, E> => {
	try {
		return ok(fn());
	} catch (error) {
		return err(onError(error));
	}
};

/**
 * Async version of tryCatch - wraps a promise-returning function
 *
 * @example
 * const result = await tryCatchAsync(
 *   () => fetch('/api/data'),
 *   (e) => ({ type: 'FETCH_FAILED', cause: e })
 * );
 */
export const tryCatchAsync = async <T, E>(
	fn: () => Promise<T>,
	onError: (error: unknown) => E,
): Promise<Result<T, E>> => {
	try {
		return ok(await fn());
	} catch (error) {
		return err(onError(error));
	}
};

// ============================================================================
// Option Type - Explicit handling of nullable values (Maybe pattern)
// ============================================================================

/**
 * Represents a value that may or may not exist.
 * Prefer this over null/undefined for explicit nullable handling.
 *
 * @template T - The type of the value when present
 */
export type Option<T> =
	| { readonly some: true; readonly value: T }
	| { readonly some: false };

/**
 * Creates an Option containing the given value
 *
 * @example
 * const opt = some(42);
 * // { some: true, value: 42 }
 */
export const some = <T>(value: T): Option<T> => ({ some: true, value });

/**
 * Represents the absence of a value
 *
 * @example
 * const opt: Option<number> = none;
 * // { some: false }
 */
export const none: Option<never> = { some: false };

/**
 * Converts a nullable value to an Option
 *
 * @example
 * fromNullable(null)      // none
 * fromNullable(undefined) // none
 * fromNullable(42)        // some(42)
 * fromNullable("")        // some("") - empty string is a value
 */
export const fromNullable = <T>(value: T | null | undefined): Option<T> =>
	value === null || value === undefined ? none : some(value);

/**
 * Transforms the value inside an Option if present
 *
 * @example
 * mapOption(some(5), x => x * 2)  // some(10)
 * mapOption(none, x => x * 2)     // none
 */
export const mapOption = <T, U>(
	option: Option<T>,
	fn: (value: T) => U,
): Option<U> => (option.some ? some(fn(option.value)) : none);

/**
 * Chains Option-returning operations
 *
 * @example
 * const findUser = (id: number): Option<User> => ...;
 * const getEmail = (user: User): Option<string> => ...;
 *
 * const email = flatMapOption(findUser(1), getEmail);
 */
export const flatMapOption = <T, U>(
	option: Option<T>,
	fn: (value: T) => Option<U>,
): Option<U> => (option.some ? fn(option.value) : none);

/**
 * Pattern matches on an Option
 *
 * @example
 * const display = matchOption(userOption, {
 *   some: (user) => user.name,
 *   none: () => "Anonymous",
 * });
 */
export const matchOption = <T, U>(
	option: Option<T>,
	handlers: { some: (value: T) => U; none: () => U },
): U => (option.some ? handlers.some(option.value) : handlers.none());

/**
 * Extracts the value from an Option, returning a default if empty
 *
 * @example
 * getOrElse(some(42), 0)  // 42
 * getOrElse(none, 0)      // 0
 */
export const getOrElse = <T>(option: Option<T>, defaultValue: T): T =>
	option.some ? option.value : defaultValue;

/**
 * Checks if an Option contains a value
 */
export const isSome = <T>(
	option: Option<T>,
): option is { some: true; value: T } => option.some;

/**
 * Checks if an Option is empty
 */
export const isNone = <T>(option: Option<T>): option is { some: false } =>
	!option.some;

// ============================================================================
// Function Composition - Building pipelines
// ============================================================================

/**
 * Left-to-right function composition for synchronous operations.
 * Takes a value and pipes it through a series of transformations.
 *
 * @example
 * const result = pipe(
 *   " hello world ",
 *   (s) => s.trim(),
 *   (s) => s.toUpperCase(),
 *   (s) => s.split(" ")
 * );
 * // ["HELLO", "WORLD"]
 */
export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(
	a: A,
	ab: (a: A) => B,
	bc: (b: B) => C,
	cd: (c: C) => D,
): D;
export function pipe<A, B, C, D, E>(
	a: A,
	ab: (a: A) => B,
	bc: (b: B) => C,
	cd: (c: C) => D,
	de: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
	a: A,
	ab: (a: A) => B,
	bc: (b: B) => C,
	cd: (c: C) => D,
	de: (d: D) => E,
	ef: (e: E) => F,
): F;
export function pipe(
	value: unknown,
	...fns: Array<(arg: unknown) => unknown>
): unknown {
	return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Left-to-right function composition for async operations.
 * Each function can be sync or async, and the pipeline awaits each step.
 *
 * @example
 * const result = await pipeAsync(
 *   userId,
 *   async (id) => await fetchUser(id),
 *   (user) => user.email,
 *   async (email) => await sendNotification(email)
 * );
 */
export async function pipeAsync<A>(a: A): Promise<A>;
export async function pipeAsync<A, B>(
	a: A,
	ab: (a: A) => B | Promise<B>,
): Promise<B>;
export async function pipeAsync<A, B, C>(
	a: A,
	ab: (a: A) => B | Promise<B>,
	bc: (b: B) => C | Promise<C>,
): Promise<C>;
export async function pipeAsync<A, B, C, D>(
	a: A,
	ab: (a: A) => B | Promise<B>,
	bc: (b: B) => C | Promise<C>,
	cd: (c: C) => D | Promise<D>,
): Promise<D>;
export async function pipeAsync<A, B, C, D, E>(
	a: A,
	ab: (a: A) => B | Promise<B>,
	bc: (b: B) => C | Promise<C>,
	cd: (c: C) => D | Promise<D>,
	de: (d: D) => E | Promise<E>,
): Promise<E>;
export async function pipeAsync<A, B, C, D, E, F>(
	a: A,
	ab: (a: A) => B | Promise<B>,
	bc: (b: B) => C | Promise<C>,
	cd: (c: C) => D | Promise<D>,
	de: (d: D) => E | Promise<E>,
	ef: (e: E) => F | Promise<F>,
): Promise<F>;
export async function pipeAsync(
	value: unknown,
	...fns: Array<(arg: unknown) => unknown | Promise<unknown>>
): Promise<unknown> {
	let result = value;
	for (const fn of fns) {
		result = await fn(result);
	}
	return result;
}

/**
 * Creates a reusable composed function from left to right.
 * Unlike pipe, flow doesn't take an initial value - it returns a function.
 *
 * @example
 * const processName = flow(
 *   (s: string) => s.trim(),
 *   (s) => s.toLowerCase(),
 *   (s) => s.replace(/\s+/g, "-")
 * );
 *
 * processName(" Hello World ")  // "hello-world"
 */
export function flow<A, B>(ab: (a: A) => B): (a: A) => B;
export function flow<A, B, C>(ab: (a: A) => B, bc: (b: B) => C): (a: A) => C;
export function flow<A, B, C, D>(
	ab: (a: A) => B,
	bc: (b: B) => C,
	cd: (c: C) => D,
): (a: A) => D;
export function flow<A, B, C, D, E>(
	ab: (a: A) => B,
	bc: (b: B) => C,
	cd: (c: C) => D,
	de: (d: D) => E,
): (a: A) => E;
export function flow<A, B, C, D, E, F>(
	ab: (a: A) => B,
	bc: (b: B) => C,
	cd: (c: C) => D,
	de: (d: D) => E,
	ef: (e: E) => F,
): (a: A) => F;
export function flow(
	...fns: Array<(arg: unknown) => unknown>
): (arg: unknown) => unknown {
	return (value: unknown) => fns.reduce((acc, fn) => fn(acc), value);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Identity function - returns its input unchanged
 * Useful as a default transformer or in conditional pipelines
 */
export const identity = <T>(value: T): T => value;

/**
 * Creates a function that always returns the same value
 *
 * @example
 * const items = [1, 2, 3].map(constant("x"));
 * // ["x", "x", "x"]
 */
export const constant =
	<T>(value: T) =>
	(): T =>
		value;

/*
 * Copyright © 2025-2026 Metreeca srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Internal utilities shared across task modules.
 *
 * @internal
 * @module
 */

import { cpus } from "os";


/**
 * Number of CPU cores available for parallel processing.
 *
 * Used as the default concurrency level when `parallel: true` is specified.
 * Optimal for CPU-bound tasks. For I/O-heavy tasks, consider using `parallel: 0`
 * for unbounded concurrency instead.
 *
 * Defaults to 4 if CPU detection fails (cpus() returns empty array).
 *
 * This conservative default maintains meaningful parallelism while avoiding
 * severe over-subscription on systems where CPU count cannot be determined.
 *
 * @internal
 */
export const cores = cpus().length || 4;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Helper for parallel processing with configurable result handling.
 *
 * @internal
 */
export async function* parallelize<V, R, T>(
	source: AsyncIterable<V>,
	mapper: (item: V) => Promise<R>,
	threads: number,
	handler: (result: R) => AsyncIterable<T>
): AsyncGenerator<T, void, unknown> {

	/**
	 * Represents a worker in the mapping phase.
	 *
	 * A mapper applies the mapper function to a source value and waits for the result.
	 * Once the promise resolves, the mapper transitions to a consumer.
	 */
	interface Mapper {
		promise: Promise<R>;
	}

	/**
	 * Represents a worker in the consuming phase.
	 *
	 * A consumer iterates through the async iterable produced by the handler function,
	 * yielding values one at a time. The iterator is retained to request subsequent values,
	 * while the promise tracks the pending next() operation.
	 */
	interface Consumer {
		iterator: AsyncIterator<T>;
		promise: Promise<IteratorResult<T>>;
	}

	const iterator = source[Symbol.asyncIterator]();
	const mappers = new Map<number, Mapper>();
	const consumers = new Map<number, Consumer>();

	// Track settled promises to prevent them from being included in subsequent Promise.race() calls

	const settledMappers = new Set<number>();
	const settledConsumers = new Set<number>();

	let nextId = 0;
	let done = false;


	/**
	 * Initiates the mapping phase for a source value.
	 *
	 * Creates a new mapper that applies the mapper function to the value
	 * and registers it in the mappers collection with a unique ID.
	 *
	 * If the mapper function throws or rejects, the error propagates to
	 * the generator, causing it to throw and trigger cleanup in the finally block.
	 */
	function startMapping(value: V): void {
		mappers.set(nextId++, { promise: mapper(value) });
	}

	/**
	 * Transitions a completed mapper to the consuming phase.
	 *
	 * Removes the mapper from the mappers collection and creates a new consumer
	 * that will iterate through the async iterable produced by the handler function.
	 * The consumer is registered with the same ID to maintain tracking.
	 */
	function completeMapping(id: number, result: R): void {
		mappers.delete(id);

		const iter = handler(result)[Symbol.asyncIterator]();

		consumers.set(id, {
			iterator: iter,
			promise: iter.next()
		});
	}

	/**
	 * Processes a consumer iteration result.
	 *
	 * If the iterator is done, removes the consumer from the collection and marks it as settled.
	 * Otherwise, advances the iterator by requesting the next value and yields
	 * the current value to the output stream.
	 *
	 * Uses atomic get-and-check to prevent race conditions where multiple
	 * completions might try to process the same consumer.
	 */
	function* completeConsuming(id: number, result: IteratorResult<T>): Generator<T> {
		// Atomically retrieve consumer to prevent racing completions
		const consumer = consumers.get(id);

		if ( !consumer ) {
			// Already processed by racing completion
			return;
		}

		if ( result.done ) {
			consumers.delete(id);
			settledConsumers.add(id);
		} else {
			// Re-register with new promise for next iteration
			// Note: Remove from settled set since we're still active
			settledConsumers.delete(id);
			consumers.set(id, {
				iterator: consumer.iterator,
				promise: consumer.iterator.next()
			});

			yield result.value;
		}
	}


	try {

		while ( mappers.size > 0 || consumers.size > 0 || !done ) {

			// Stage 1: Feed source values into mapping phase until thread limit reached

			// Thread management: The `threads` parameter defines the total concurrency limit
			// across both mapping and consuming phases. This ensures we never exceed the
			// specified number of concurrent operations, regardless of which phase they're in.
			// Only active (unsettled) workers count against the thread limit.

			while ( mappers.size+consumers.size < threads && !done ) {

				const next = await iterator.next();

				if ( next.done ) {
					done = true;
				} else {
					startMapping(next.value);
				}
			}

			// Stage 2: Process completed mappings and consumptions

			// Only include unsettled promises in the race to avoid processing the same
			// promise multiple times when it wins consecutive races

			const events = [
				...Array.from(mappers.entries())
					.filter(([id]) => !settledMappers.has(id))
					.map(([id, m]) =>
						m.promise.then(mapped => ({ type: "mapped" as const, id, mapped }))
					),
				...Array.from(consumers.entries())
					.filter(([id]) => !settledConsumers.has(id))
					.map(([id, c]) =>
						c.promise.then(consumed => ({ type: "consumed" as const, id, consumed }))
					)
			];

			if ( events.length !== 0 ) {

				// If any mapper or consumer promise rejects, the error propagates here
				// and triggers cleanup in the finally block

				const event = await Promise.race(events);

				if ( event.type === "mapped" ) {
					settledMappers.add(event.id);
					if ( mappers.has(event.id) ) {
						completeMapping(event.id, event.mapped);
						// Clear settled marker after transition to consumer phase
						settledMappers.delete(event.id);
					}
				} else {
					if ( consumers.has(event.id) ) {
						yield* completeConsuming(event.id, event.consumed);
						// Clear settled marker after consumer completes
						if ( !consumers.has(event.id) ) {
							settledConsumers.delete(event.id);
						}
					}
				}
			}

			// All active promises have settled but haven't been processed yet
			// Loop will process them on next iteration or exit if all work is done

		}

	} finally {

		// Cleanup: Close source iterator and wait for all in-flight work to complete

		try {
			await iterator.return?.();
		} catch ( error ) {
			// Suppress iterator cleanup errors to ensure all cleanup completes
		}

		// Wait for all mapper promises to settle (resolve or reject)
		// This ensures no pending async work is abandoned

		await Promise.allSettled(
			Array.from(mappers.values()).map(m => m.promise)
		);

		// Close all consumer iterators
		// Errors during consumer cleanup are suppressed to ensure all iterators are closed

		await Promise.allSettled(
			Array.from(consumers.values()).map(c => c.iterator.return?.())
		);

	}

}

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

import { assert } from "@metreeca/core";
import { Task } from "../index.js";


/**
 * Creates a task interleaving several runs of another task over the same feed.
 *
 * Runs draw from the same source, each item going to exactly one of them, processed through that run's own invocation
 * of `task` and emitted as soon as it is ready. Runs are interleaved on the event loop rather than executed in
 * parallel, so running a task that blocks the event loop concurrently buys nothing.
 *
 * `concurrency` caps the number of items being processed at the same time, which is also how far ahead of the
 * downstream consumer items are pulled from the source: raising it trades memory for throughput. All runs start
 * together when the feed is opened, so `task` is invoked exactly `concurrency` times whether or not the source is
 * fast enough to keep every run busy.
 *
 * > [!WARNING]
 * >
 * > Output order is not preserved: results are emitted as each run completes, so they interleave and overtake each
 * > other according to how long every item takes to process.
 *
 * > [!CAUTION]
 * >
 * > `concurrency` is not a rate limit: nothing paces the runs, so a source that never runs dry keeps `concurrency`
 * > items permanently in flight. Pace the work inside `task` instead, for instance with a
 * > {@link https://metreeca.github.io/core/interfaces/async.Throttle.html Throttle} from the `@metreeca/core/async`
 * > module.
 *
 * > [!CAUTION]
 * >
 * > Run stateless tasks only. `task` is invoked once per run, so state it keeps per invocation becomes per-run
 * > rather than feed-wide: {@link distinct} deduplicates within a run, {@link take} yields its quota to each one.
 * > State captured in its closure is shared instead, and hit concurrently.
 *
 * > [!NOTE]
 * >
 * > When an error occurs, all pending operations are awaited (but not failed) before the error is thrown, to prevent
 * > resource leaks. Runs failing while the consumer is idle report their error when the feed is next advanced,
 * > rather than escaping as unhandled rejections.
 *
 * > [!NOTE]
 * >
 * > Closing the feed early waits for the in-flight pulls and the running tasks to settle before the source is
 * > closed, so a source idling between items delays it; failures reported while closing are suppressed if an error
 * > is already propagating.
 *
 * @typeParam V The type of input items
 * @typeParam R The type of output items
 *
 * @param concurrency The number of concurrent runs; values less than 1 are treated as 1, that is, as sequential
 *   processing
 * @param task The task each run applies to the items it pulls from the source feed
 *
 * @returns A task processing items concurrently through `task`
 *
 * @throws {TypeError} If `concurrency` is not an integer
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (feed(ids))
 *   (concurrent(8, retrieve()))
 *   (toArray())
 * );  // 8 runs, at most 8 items in flight
 * ```
 */
export function concurrent<V, R>(concurrency: number, task: Task<V, R>): Task<V, R> {

	const limit = Math.max(1, assert(concurrency, Number.isInteger, value =>
		`expected integer concurrency <${value}>`
	));

	return async function* (source: AsyncIterable<V>) {

		type Run = AsyncIterator<undefined | R, void, undefined>; // one invocation of the task, iterated by the loop
		type Step = { run: Run, result: IteratorResult<undefined | R, void> }; // one result, tagged with its run


		// the single reader of the source: wrapping it in an async generator serialises the pulls issued by the runs

		const reader = (async function* () { yield* source; })();

		// every run draws from the same cursor, which is also its own iterable; omitting return() keeps a run
		// closing early from closing the source

		const shared: AsyncIterableIterator<V> = {
			next: () => reader.next(), [Symbol.asyncIterator]: () => shared
		};


		// live runs, each mapped to the promise of its next step; all created before any is started, so a
		// task failing to create one leaves nothing to clean up; as none is added later, the map only shrinks

		const pending = new Map(Array
			.from({ length: limit }, (): Run => task(shared)[Symbol.asyncIterator]())
			.map<[Run, Promise<Step>]>(run => [run, step(run)])
		);


		try {

			while ( pending.size > 0 ) {

				const { run, result } = await Promise.race(pending.values());

				if ( result.done ) { // a run ran dry: drop it from the map

					pending.delete(run);

				} else { // a run produced an item: put it back to work before yielding, to keep it busy meanwhile

					pending.set(run, step(run));

					yield result.value;

				}

			}

		} catch ( error ) { // close the source here, so that a failing close doesn't mask the propagating error

			await Promise.allSettled([reader.return()]);

			throw error;

		} finally { // clean up runs and source on error or early termination

			await Promise.allSettled([
				...Array.from(pending.keys(), run => run.return?.()), // close the runs, then
				...pending.values() // suppress late failures from their abandoned steps
			]);

			await reader.return(); // resolves at once if the source was already closed

		}


		/**
		 * Takes the next step of a run, tagging its result with the run that produced it.
		 */
		function step(run: Run): Promise<Step> {

			const promise = run.next().then(result => ({ run, result }));

			promise.catch(() => {}); // mark as handled: the merging loop observes the step only when it resumes

			return promise;

		}

	};

}

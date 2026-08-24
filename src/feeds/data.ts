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

import { isPromise } from "@metreeca/core";
import type { Awaitable } from "@metreeca/core/async";
import { Data, Pipe, Sink, Task } from "../index.js";
import { flatten } from "../index.core.js";


/**
 * Creates a pipe from a data source.
 *
 * The feed is a {@link index.Data Data} value, normalised into the stream according to its shape, with `undefined`
 * values dropped as they enter it. A promised feed is awaited when the stream is consumed, deferring retrieval from
 * APIs, databases or any other asynchronous source until then. This is also the adapter custom feeds wrap their
 * async generators in, to enter the pipeline under the same guarantees.
 *
 * @typeParam V The type of items in the stream
 *
 * @param feed The data source to open the stream from, supplied either directly or as a promise
 *
 * @returns A pipe carrying the items contributed by `feed`
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (data([1, 2, 3]))
 *   (toArray())
 * );  // [1, 2, 3]
 *
 * await pipe(
 *   (data(new Set([1, 2, 3])))
 *   (toArray())
 * );  // [1, 2, 3]
 *
 * await pipe(
 *   (data(fetchReport()))
 *   (toArray())
 * );  // the items of the awaited report
 * ```
 *
 * @see {@link items} to open a stream from values contributed as they are, without shape inspection
 */
export function data<V>(feed: Awaitable<Data<V>>): Pipe<V> {

	async function* generator() {
		for await (const item of flatten(await feed)) {
			if ( item !== undefined ) {
				yield item;
			}
		}
	}

	function pipe(): AsyncIterable<V>;
	function pipe<R>(task: Task<V, R>): Pipe<R>;
	function pipe<R>(sink: Sink<V, R>): Promise<R>;
	function pipe<R>(step?: Task<V, R> | Sink<V, R>): unknown {

		if ( step ) {

			const result = step(generator());

			return isPromise(result) ? result : data(result);

		} else {

			return generator();

		}
	}

	return pipe;

}

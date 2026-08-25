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

import { isFunction, isPromise, isString } from "@metreeca/core";
import type { Awaitable } from "@metreeca/core/async";
import { Data, Feed, Sink, Task } from "../index.js";


/**
 * Creates a feed from a data source.
 *
 * The source is a {@link index.Data Data} value, normalised into the feed according to its shape, with `undefined`
 * values dropped as they enter it. Sources are batches of items rather than single values, so a lone value opens a
 * feed once wrapped in an array, and an empty batch opens an empty feed. A promised source is awaited when the
 * feed is consumed, deferring retrieval from APIs, databases or any other asynchronous source until then. This is
 * also the adapter custom feeds wrap their async generators in, so that their items enter under the same guarantees.
 *
 * @typeParam V The type of values contributed to the feed
 *
 * @param data The data source to open the feed from, supplied either directly or as a promise
 *
 * @returns A feed carrying the items contributed by `data`
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (feed([1, 2, 3]))
 *   (toArray())
 * );  // [1, 2, 3]
 *
 * await pipe(
 *   (feed(new Set([1, 2, 3])))
 *   (toArray())
 * );  // [1, 2, 3]
 *
 * await pipe(
 *   (feed(fetchReport()))
 *   (toArray())
 * );  // the items of the awaited report
 * ```
 *
 * @see {@link items} to open a feed from values contributed as they are, without shape inspection
 */
export function feed<V>(data: Awaitable<Data<V>>): Feed<V> {

	async function* generator() {
		for await (const item of flatten(await data)) {
			if ( item !== undefined ) {
				yield item;
			}
		}
	}


	function next(): AsyncIterable<V>;
	function next<R>(task: Task<V, R>): Feed<R>;
	function next<R>(sink: Sink<V, R>): Promise<R>;

	function next<R>(step?: Task<V, R> | Sink<V, R>): unknown {

		if ( step ) {

			const result = step(generator());

			return isPromise(result) ? result : feed(result);

		} else {

			return generator();

		}

	}

	return next;


	/**
	 * Expands a data source into the items it contributes, according to its shape; optional entries are yielded as
	 * they are met, to be dropped as they enter the feed.
	 */
	async function* flatten<V>(data: Data<V>): AsyncGenerator<undefined | V, void, unknown> {

		if ( isString(data) ) { // strings are atomic data items, not character sequences

			yield data as V; // ;(cast) no other shape accepts a string, so `V` admits string values here

		} else if ( isFunction(data) ) { // feeds are callable rather than iterable: invoked to obtain the iterable

			yield* data();

		} else { // async delegation covers sync and async iterables alike

			yield* data;

		}

	}

}

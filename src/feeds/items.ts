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
 * Data sources are handled as follows:
 *
 * - `undefined` - filtered out and not yielded
 * - **Primitives** (strings, numbers, booleans, null): Treated as atomic values and yielded as single items
 * - **Arrays/Iterables** (excluding strings): Items are yielded individually
 * - **Async Iterables/Pipes**: Items are yielded as they become available
 * - **Promises and other thenables**: Awaited and then processed according to their resolved value
 * - **Other values** (objects, etc.): Yielded as single items
 *
 * The feed may be supplied either directly or as a promise, which is awaited when the stream is consumed: deferred
 * feeds are useful for data retrieved from APIs, databases, or any other asynchronous source.
 *
 * @typeParam V The type of items in the stream
 *
 * @param feed The source to create a pipe from, either a value or a promise resolving to one
 *
 * @returns A pipe for fluent composition
 */
export function items<V>(feed: Awaitable<Data<V>>): Pipe<V>;

/**
 * Creates a pipe from multiple scalar values.
 *
 * @typeParam V The type of items in the stream
 *
 * @param values The scalar values to create a pipe from
 *
 * @returns A pipe for fluent composition
 */
export function items<V>(...values: readonly [V, V, ...V[]]): Pipe<V>;

/**
 * Creates a pipe from a data source or from multiple scalar values.
 */
export function items<V>(feed: Awaitable<Data<V>>, ...values: V[]): Pipe<V> {

	async function* generator() {
		for await (const item of flatten(values.length > 0 ? [await feed, ...values] as V[] : await feed)) {
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

			return isPromise(result) ? result : items(result);

		} else {

			return generator();

		}
	}

	return pipe;

}

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

import { isNumber } from "@metreeca/core";
import type { Awaitable } from "@metreeca/core/async";
import { Task } from "../index.js";
import { cores, parallelize } from "./index.core.js";


/**
 * Creates a task that maps each input item to an output value using a mapper function.
 *
 * Items are processed sequentially by default, preserving output order. In parallel mode,
 * items are processed concurrently and emitted as they complete without preserving order.
 *
 * > [!NOTE]
 * >
 * > In parallel mode, when an error occurs all pending operations are awaited (but not failed) before the error is
 * > thrown to prevent resource leaks.
 *
 * @typeParam V The type of input values
 * @typeParam R The type of mapped result values
 *
 * @param mapper The possibly asynchronous function to transform each item. When the mapper returns `undefined`,
 *   that value is filtered out and not included in the output stream.
 * @param parallel Concurrency control: `false`/`undefined`/`1` for sequential (default),
 *   `true` for parallel with auto-detected concurrency (CPU cores), `0` for unbounded concurrency (I/O-heavy tasks),
 *   or a number > 1 for explicit concurrency limit
 *
 * @returns A task that transforms items using the mapper function
 *
 * @example
 *
 * ```typescript
 * map((n: number) => n * 2)                                            // sequential
 * map(async (id: string) => fetch(`/users/${id}`), { parallel: true }) // parallel (CPU cores)
 * map(async (url: string) => fetch(url), { parallel: 0 })              // unbounded (I/O-heavy)
 * map(heavyOperation, { parallel: 4 })                                 // parallel with limit
 * ```
 */
export function map<V, R>(
	mapper: (item: V) => Awaitable<undefined | R>,
	{ parallel }: { parallel?: boolean | number } = {}
): Task<V, R> {

	if ( parallel === true || isNumber(parallel) && parallel !== 1 ) {

		const concurrency = parallel === true ? cores
			: parallel === 0 ? Infinity
				: parallel;

		return source => parallelize(
			source,
			item => Promise.resolve(mapper(item)),
			concurrency,
			async function* (result) { yield result; }
		);

	} else {

		return async function* (source: AsyncIterable<V>) {
			for await (const item of source) {
				yield await mapper(item);
			}
		};

	}

}

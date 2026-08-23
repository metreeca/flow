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

import type { Awaitable } from "@metreeca/core/async";
import { Sink } from "../index.js";


/**
 * Creates a sink reducing the stream to a single value without an initial value.
 *
 * @typeParam V The type of items in the stream
 *
 * @param reducer The possibly asynchronous function to combine the accumulator with each item
 *
 * @returns A sink that reduces the stream to a single value, the first item for singleton streams, or `undefined` for
 *   empty streams
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 3, 4, 5])(reduce((acc, x) => acc + x));  // 15
 * await items([42])(reduce((acc, x) => acc + x));  // 42
 * await items([])(reduce((acc, x) => acc + x));  // undefined
 * ```
 */
export function reduce<V>(reducer: (accumulator: V, item: V) => Awaitable<V>): Sink<V, undefined | V>;

/**
 * Creates a sink reducing the stream to a single value with an initial value.
 *
 * @typeParam V The type of items in the stream
 * @typeParam R The type of the accumulated result
 *
 * @param reducer The possibly asynchronous function to combine the accumulator with each item
 * @param initial The initial value for the accumulator
 *
 * @returns A sink that reduces the stream to a single value
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 3, 4, 5])(reduce((acc, x) => acc + x, 0));  // 15
 * await items([1, 2, 3, 4, 5])(reduce((acc, x) => acc + x, 10));  // 25
 * await items([])(reduce((acc, x) => acc + x, 0));  // 0
 * ```
 */
export function reduce<V, R>(reducer: (accumulator: R, item: V) => Awaitable<R>, initial: R): Sink<V, R>;

/**
 * Creates a sink reducing the stream to a single value, with or without an initial value.
 */
export function reduce<V, R>(reducer: Function, initial?: R): Sink<V, undefined | V | R> {

	return async source => {

		let started = arguments.length > 1;
		let accumulator: V | R | undefined = started ? initial : undefined;

		for await (const item of source) {
			if ( started ) {
				accumulator = await reducer(accumulator, item);
			} else {
				accumulator = item;
				started = true;
			}
		}

		return accumulator;

	};

}

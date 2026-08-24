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

import { Task } from "../index.js";


/**
 * Creates a task observing the stream without altering it.
 *
 * Every item is handed to the consumer before being emitted unchanged, making the stream observable at any point of a
 * pipeline for tracing, logging or metering purposes.
 *
 * @typeParam V The type of items in the stream
 *
 * @param consumer The function observing each item; a returned promise is awaited before the item moves on, so
 *   asynchronous side effects hold the stream back until they complete
 *
 * @returns A task yielding the items of the stream unchanged
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items(1, 2, 3))
 *   (peek(n => console.log(n)))
 *   (toArray())
 * );  // logs 1, 2, 3; [1, 2, 3]
 * ```
 */
export function peek<V>(consumer: (item: V) => unknown): Task<V> {

	return async function* (source: AsyncIterable<V>) {
		for await (const item of source) {
			await consumer(item);
			yield item;
		}
	};

}

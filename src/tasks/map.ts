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
import { Task } from "../index.js";


/**
 * Creates a task converting each item into a new value.
 *
 * Items are converted lazily, one at a time, and emitted in source order.
 *
 * @typeParam V The type of input items
 * @typeParam R The type of output items
 *
 * @param mapper The function converting each item; an `undefined` result contributes nothing, so mapping doubles as
 *   filtering
 *
 * @returns A task yielding the values `mapper` converts the items into
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items(1, 2, 3))
 *   (map(n => n*2))
 *   (toArray())
 * );  // [2, 4, 6]
 * ```
 */
export function map<V, R>(mapper: (item: V) => Awaitable<undefined | R>): Task<V, R> {

	return async function* (source: AsyncIterable<V>) {
		for await (const item of source) {
			yield await mapper(item);
		}
	};

}

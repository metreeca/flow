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

import { Sink } from "../index.js";


/**
 * Creates a sink collecting all items into an array.
 *
 * @typeParam V The type of items in the stream
 *
 * @returns A sink that collects all items into an array
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 3])(toArray());  // [1, 2, 3]
 * await items(new Set([1, 2, 3]))(toArray());  // [1, 2, 3]
 * ```
 */
export function toArray<V>(): Sink<V, readonly V[]> {

	return async source => {

		const array: V[] = [];

		for await (const item of source) {
			array.push(item);
		}

		return array;

	};

}

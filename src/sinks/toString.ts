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
 * Creates a sink joining all items into a string using a separator.
 *
 * @typeParam V The type of items in the stream
 *
 * @param separator The string to insert between items
 *
 * @returns A sink that joins all items into a single string
 *
 * @remarks
 *
 * Behaves like `Array.prototype.join()`, converting each item to a string and joining them
 * with the specified separator. Items are converted using their default string representation.
 * `null` values are converted to empty strings.
 *
 * > [!WARNING]
 * >
 * > Unlike `Array.prototype.join()`, `undefined` values are automatically filtered out
 * > by the stream pipeline before reaching this sink, so they will not appear in the output.
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 3])(toString());  // "1,2,3"
 * await items([1, 2, 3])(toString(" - "));  // "1 - 2 - 3"
 * await items(["a", "b", "c"])(toString());  // "a,b,c"
 * ```
 */
export function toString<V>(separator: string = ","): Sink<V, string> {
	return async source => {

		const items: string[] = [];

		for await (const item of source) {
			items.push(item == null ? "" : String(item));
		}

		return items.join(separator);
	};
}

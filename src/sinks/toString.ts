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
 * Creates a sink joining the items of the feed into a string.
 *
 * Items are rendered and joined as `Array.prototype.join()` would, that is through their default string
 * representation, `null` values excepted, which are rendered as empty strings; an empty feed joins to an empty
 * string.
 *
 * @typeParam V The type of items in the feed
 *
 * @param separator The string inserted between consecutive items, defaulting to `,`
 *
 * @returns A sink resolving to the string joining the items of the feed
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items(1, 2, 3))
 *   (toString())
 * );  // "1,2,3"
 *
 * await pipe(
 *   (items(1, 2, 3))
 *   (toString(" - "))
 * );  // "1 - 2 - 3"
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

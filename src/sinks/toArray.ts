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

import { immutable } from "@metreeca/core/structures";
import { Sink } from "../index.js";


/**
 * Creates a sink collecting the items of the feed into an array.
 *
 * Items are collected in source order and the array is made {@link immutable} once the feed is drained, freezing it
 * together with the items collected into it.
 *
 * > [!WARNING]
 * >
 * > Accumulates the whole feed in memory. For large or infinite feeds, this may exhaust memory or never complete.
 *
 * > [!WARNING]
 * >
 * > Freezing clones structured items, giving them a fresh identity: entries are not reachable through the original
 * > item reference. Supply structured items as {@link immutable} values to keep their identity stable.
 *
 * @typeParam V The type of items in the feed
 *
 * @returns A sink resolving to the deeply {@link immutable} read-only array of the items of the feed
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items(1, 2, 3))
 *   (toArray())
 * );  // [1, 2, 3]
 * ```
 */
export function toArray<V>(): Sink<V, readonly V[]> {

	return async source => {

		const array: V[] = [];

		for await (const item of source) {
			array.push(item);
		}

		return immutable(array);

	};

}

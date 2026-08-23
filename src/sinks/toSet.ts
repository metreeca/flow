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


const readonly = () => { throw new TypeError("unsupported mutation of immutable set"); };


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a sink collecting all unique items into a deeply immutable set.
 *
 * Items are compared with `SameValueZero` semantics, so `NaN` matches itself and `-0` matches `0`.
 *
 * Items are made {@link immutable} as they are collected.
 *
 * > [!WARNING]
 * > Freezing clones structured items, giving them a fresh identity: entries are not reachable through the original
 * > item reference, and the same mutable item collected twice yields two distinct entries rather than being
 * > deduplicated. Feed structured items as {@link immutable} values to keep their identity stable.
 *
 * The returned set is frozen, with `add`, `delete` and `clear` shadowed by own properties that throw: entries cannot
 * be altered through the set, although mutating methods invoked directly on `Set.prototype` still reach the internal
 * slots backing them.
 *
 * @typeParam V The type of items in the stream
 *
 * @returns A sink that collects all unique items, each made deeply {@link immutable}, into a read-only set
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 2, 3, 3, 3])(toSet());  // Set(3) { 1, 2, 3 }
 * await items([1, 2, 3])(toSet());  // Set(3) { 1, 2, 3 }
 * ```
 */
export function toSet<V>(): Sink<V, ReadonlySet<V>> {

	return async source => {

		const set = new Set<V>();

		for await (const item of source) {
			set.add(immutable(item));
		}

		// shadow mutators with own properties: freezing doesn't reach the internal slots backing set entries

		return Object.freeze(Object.defineProperties(set, {

			add: { value: readonly },
			delete: { value: readonly },
			clear: { value: readonly }

		}));

	};

}

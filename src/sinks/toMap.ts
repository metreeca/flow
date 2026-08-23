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
 * Creates a sink collecting items into a map using extracted keys and item values.
 *
 * Keys must be unique: an item whose key was already collected causes the sink to fail rather than silently
 * overwriting the previously collected entry. Keys are compared with `SameValueZero` semantics, so `NaN` matches
 * itself and `-0` matches `0`.
 *
 * @typeParam V The type of items in the stream
 * @typeParam K The type of map keys
 *
 * @param key The possibly asynchronous function to extract the key from each item
 *
 * @returns A sink that collects items into a read-only map pairing each extracted key with its item
 *
 * @throws {Error} If two items yield the same key
 *
 * @example
 *
 * ```typescript
 * await items([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }])(toMap(x => x.id));
 * // Map(2) { 1 => { id: 1, name: "Alice" }, 2 => { id: 2, name: "Bob" } }
 * ```
 */
export function toMap<V, K>(
	key: (item: V) => Awaitable<K>
): Sink<V, ReadonlyMap<K, V>>;

/**
 * Creates a sink collecting items into a map using extracted keys and values.
 *
 * Keys must be unique: an item whose key was already collected causes the sink to fail rather than silently
 * overwriting the previously collected entry. Keys are compared with `SameValueZero` semantics, so `NaN` matches
 * itself and `-0` matches `0`.
 *
 * @typeParam V The type of items in the stream
 * @typeParam K The type of map keys
 * @typeParam R The type of map values
 *
 * @param key The possibly asynchronous function to extract the key from each item
 * @param value The possibly asynchronous function to transform each item into a map value
 *
 * @returns A sink that collects items into a read-only map pairing each extracted key with its extracted value
 *
 * @throws {Error} If two items yield the same key
 *
 * @example
 *
 * ```typescript
 * await items([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }])(toMap(x => x.id, x => x.name));
 * // Map(2) { 1 => "Alice", 2 => "Bob" }
 * ```
 */
export function toMap<V, K, T>(
	key: (item: V) => Awaitable<K>,
	value: (item: V) => Awaitable<T>
): Sink<V, ReadonlyMap<K, T>>;

/**
 * Creates a sink collecting items into a map using extracted keys, with or without a value selector.
 */
export function toMap<V, K, R>(
	key: (item: V) => Awaitable<K>,
	value?: (item: V) => Awaitable<R>
): Sink<V, ReadonlyMap<K, V | R>> {

	return async source => {

		const map = new Map<K, V | R>();

		for await (const item of source) {

			const entry = await key(item);

			if ( map.has(entry) ) {
				throw new Error(`duplicate key <${String(entry)}>`);
			}

			map.set(entry, value ? await value(item) : item);

		}

		return map;
	};

}

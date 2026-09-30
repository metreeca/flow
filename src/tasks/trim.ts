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

import { Optional } from "@metreeca/core";
import { items } from "../feeds/items.js";
import type { Feed, Task } from "../index.js";


/**
 * Creates a task dropping `undefined` items from a feed.
 *
 * Items are emitted in source order; `undefined` items are dropped wherever they occur, not only at the ends of the
 * feed, while `null` and other falsy values are retained.
 *
 * > [!NOTE]
 * >
 * > - **Incremental**: items are emitted as they are drawn, so the reported feed runs dry as the feed drawn from
 * >   does.
 * > - **Streaming**: items are tested one at a time, none retained.
 * > - **Stateless**: every item is tested on its own, so the outcome is unaffected by how the feed is split across
 * >   nested feeds or runs.
 *
 * @typeParam V The type of the defined items in the feed
 *
 * @returns A task yielding the defined items of the feed in source order
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([undefined, 1, undefined, 2]))
 *   (trim())
 *   (toArray())
 * );  // [1, 2]
 * ```
 */
export function trim<V>(): Task<Optional<V>, V>;

/**
 * Creates a task dropping the `undefined` items another task reports.
 *
 * Maps and drops items in a single stage: wrapping a mapper that returns `undefined` for the items to discard keeps
 * the others as mapped. Items are emitted in the order `task` reports them; `undefined` items are dropped wherever
 * they occur, while `null` and other falsy values are retained.
 *
 * > [!NOTE]
 * >
 * > - **Incremental**: items are emitted as `task` reports them, so the reported feed runs dry as the source and
 * >   `task` do.
 * > - **Streaming**: items are tested one at a time, none retained, whatever `task` holds.
 * > - **Stateless**: every item is tested on its own, whatever `task` carries across the items it draws.
 *
 * @typeParam V The type of items drawn from the feed
 * @typeParam R The type of the defined items `task` reports
 *
 * @param task The task reporting the items to trim
 *
 * @returns A task yielding the defined items `task` reports, in the order it reports them
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([1, 2, 3, 4]))
 *   (trim(map(n => n%2 ? n*10 : undefined)))
 *   (toArray())
 * );  // [10, 30]
 * ```
 */
export function trim<V, R>(task: Task<V, Optional<R>> & { readonly [Symbol.asyncIterator]?: never }): Task<V, R>;

/**
 * Opens a feed carrying the defined items of another feed.
 *
 * Trims a feed in place, without routing it through a pipe: `trim(feed)` carries the same items as `feed(trim())`.
 * Items are emitted in the order `feed` carries them; `undefined` items are dropped wherever they occur, while `null`
 * and other falsy values are retained.
 *
 * > [!NOTE]
 * >
 * > - **Incremental**: items are emitted as they are drawn, so the opened feed runs dry as `feed` does.
 * > - **Streaming**: items are tested one at a time, none retained.
 * > - **Stateless**: every item is tested on its own.
 *
 * @typeParam V The type of the defined items in the feed
 *
 * @param feed The feed carrying the items to trim
 *
 * @returns A feed carrying the defined items of `feed` in source order
 *
 * @example
 *
 * ```typescript
 * await trim(items([undefined, 1, undefined, 2]))(toArray());  // [1, 2]
 * ```
 */
export function trim<V>(feed: Feed<Optional<V>>): Feed<V>;

/**
 * Creates a task dropping `undefined` items, with or without a task reporting the items to trim, or opens a feed
 * carrying the defined items of another feed.
 */
export function trim<V>(target?: Feed<Optional<V>> | Task<Optional<V>>): Feed<V> | Task<Optional<V>, V> {

	return target !== undefined && Symbol.asyncIterator in target
		? target(trim<V>())
		: (source: Feed<Optional<V>>) => items((async function* () {

			for await (const item of target ? target(source) : source) {
				if ( item !== undefined ) {
					yield item;
				}
			}

		})());

}

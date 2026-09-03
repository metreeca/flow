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

import type { Feed, Task } from "../index.js";
import { items } from "../feeds/items.js";


/**
 * Creates a task splicing a feed of feeds into a single feed.
 *
 * Nested feeds are consumed one at a time, each fully drained before the next is opened, so items are emitted in source
 * order, those of every nested feed kept together and in their own order; a nested feed contributing nothing simply
 * drops out. Nothing is drawn from a nested feed until its turn comes, so one deferring retrieval until consumption is
 * left untouched until then.
 *
 * > [!WARNING]
 * >
 * > - **Incremental**: items are emitted as the nested feeds are drained, so the reported feed runs dry as the source
 * >   and its nested feeds do; an infinite nested feed starves the ones behind it, which are never opened.
 * > - **Streaming**: nested feeds are drained one at a time, none held.
 * > - **Stateless**: nested feeds are spliced without state carried across them.
 *
 * @typeParam V The type of items carried by the nested feeds
 *
 * @returns A task yielding the items of every nested feed in source order
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([items([1, 2]), items([3, 4])]))
 *   (flat())
 *   (toArray())
 * );  // [1, 2, 3, 4]
 * ```
 *
 * @see {@link map} to open a feed for each item, expanding it into several before the splice
 * @see {@link join} to splice the same feeds as their items become available
 * @see {@link fork} to interleave several runs of a task over the same feed
 */
export function flat<V>(): Task<Feed<V>, V>;

/**
 * Creates a task splicing a feed of feeds into a single feed, processing every nested feed on its own.
 *
 * Splices as the overload taking no argument does, handing each nested feed to `task` before its items enter the
 * reported feed, so that a whole pipe is applied within the bounds of a nested feed rather than across the spliced
 * items.
 *
 * > [!WARNING]
 * >
 * > - **Incremental**: items are emitted as the nested feeds are drained, so the reported feed runs dry as the source,
 * >   its nested feeds and `task` do; an infinite nested feed starves the ones behind it, which are never opened.
 * > - **Streaming**: nested feeds are drained one at a time, whatever `task` holds within each.
 * > - **Stateless**: the splice carries no state across nested feeds, whatever `task` carries within each.
 *
 * > [!CAUTION]
 * >
 * > A stateful `task` never sees the whole feed. It is invoked once per nested feed, so state it initialises on
 * > invocation is scoped to that feed alone: {@link distinct} deduplicates within a nested feed, {@link take} yields
 * > its quota to each one and {@link sort} orders each independently. State captured in its enclosing closure is
 * > shared across all of them instead.
 * >
 * > Splice a stateful task only where its outcome is sound on one nested feed at a time; apply it to the spliced
 * > feed instead, downstream of `flat()`, where it is to decide on every item.
 *
 * @typeParam V The type of items carried by the nested feeds
 * @typeParam R The type of items reported by `task`
 *
 * @param task The task applied to each nested feed
 *
 * @returns A task yielding the items `task` reports for every nested feed, in source order
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([items([1, 2]), items([3, 4])]))
 *   (flat(map(n => n*10)))
 *   (toArray())
 * );  // [10, 20, 30, 40]
 * ```
 *
 * @see {@link join} to splice the same feeds as their items become available
 * @see {@link fork} to interleave several runs of a task over the same feed
 */
export function flat<V, R>(task: Task<V, R>): Task<Feed<V>, R>;

/**
 * Creates a task splicing a feed of feeds, with or without a task processing every nested feed.
 */
export function flat<V, R>(task: Task<V, V | R> = feed => feed): Task<Feed<V>, V | R> {

	return source => items((async function* () {

		for await (const feed of source) {
			yield* task(feed);
		}

	})());

}

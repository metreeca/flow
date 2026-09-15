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

import type { Awaitable, Awaitables } from "@metreeca/core/async";
import { items } from "../feeds/items.js";
import type { Task } from "../index.js";
import { join } from "./join.js";


/**
 * Creates a task mixing additional sources into a feed.
 *
 * Each source is opened as {@link feeds.items items()} opens it, contributing its items according to its shape, and
 * its items are interleaved with those of the feed and of the other sources, each emitted as soon as it is ready.
 * Listing the sources in the call combines several origins without carrying them in a feed of their own.
 *
 * Sources draw nothing from the feed and nothing from each other, so they run at their own pace: one idling or
 * long-running delays its own items alone, whatever the others are doing.
 *
 * > [!WARNING]
 * >
 * > - **Incremental**: items are emitted as the feed drawn from and the sources report them, so the reported feed runs
 * >   dry as all of them do; a source that never runs dry keeps it open without holding back the items of the others.
 * > - **Streaming**: one item is held in flight for the feed drawn from and for every source, so nothing beyond the
 * >   number of sources named is retained.
 * > - **Stateless**: the interleaving carries no state across the sources.
 *
 * > [!WARNING]
 * >
 * > Output order is not preserved: the items of the feed drawn from and of the sources interleave and overtake each
 * > other according to how long each takes, though the items of each keep their own order among themselves.
 *
 * > [!NOTE]
 * >
 * > Sources are drawn exactly as handed over, so a task mixing a source drained by iteration reports its items on the
 * > first application alone, while one mixing a repeatable source contributes them afresh at every application.
 *
 * > [!NOTE]
 * >
 * > Sources failing while the consumer is idle report their error when the feed is next advanced, rather than escaping
 * > as unhandled rejections.
 *
 * > [!NOTE]
 * >
 * > Every source and the feed drawn from are closed when the reported feed is exhausted, fails or is closed early,
 * > waiting for the work already in flight to settle first; failures reported while closing are suppressed.
 *
 * @typeParam V The type of items drawn from the feed
 * @typeParam R The type of items contributed by the sources
 *
 * @param sources The sources to mix in, each supplied either as it is or as a promise; handing over none reports the
 *   items of the feed drawn from unchanged
 *
 * @returns A task yielding the items of the feed drawn from and of every source, as they become available
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([1, 2]))
 *   (mix(items([3, 4]), 5))
 *   (toArray())
 * );  // 1, 2 from the feed, 3, 4 from the mixed feed and 5 as a single item, in no defined order
 * ```
 */
export function mix<V, R = never>(...sources: readonly (Awaitable<R> | Awaitables<R>)[]): Task<V, V | R> {

	return source => items([
		items<V | R>(source),
		...sources.map(other => items<V | R>(other))
	])(join());

}

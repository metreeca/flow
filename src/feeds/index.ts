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

/**
 * Factory functions that open a feed over values and data sources.
 *
 * Feeds open the {@link index.Feed Feed} a pipe is built on, adapting values and data sources into one ready for task
 * and sink composition; several feeds are combined into a single one by carrying them in a feed of their own and
 * splicing it with {@link tasks.flat flat} or {@link tasks.join join}. Work is deferred until a sink or a manual
 * iteration consumes the feed.
 *
 * Every feed is classified as **bounded** or **infinite**: a bounded feed runs dry on its own, while an infinite one
 * has to be bounded downstream, with a task such as {@link tasks.take take} or with a sink deciding its outcome
 * early.
 *
 * > [!NOTE]
 * >
 * > A custom feed is only required to honour the {@link index.Feed Feed} contract, however it is assembled: handing
 * > the source to {@link items} is the shortest route there, as the adapter takes the contract on, while a source
 * > that is already a feed honours it as it is. Whichever route is taken, a feed replays only as far as its source
 * > does, so one opened from a generator object runs dry after the first pass, while one opened from a repeatable
 * > source is consumed afresh at each.
 *
 * **Custom Feeds** open a pipe over a source of your own:
 *
 * ```typescript
 * import { pipe } from '@metreeca/flow';
 * import { items } from '@metreeca/flow/feeds';
 * import { toArray } from '@metreeca/flow/sinks';
 * import type { Feed } from '@metreeca/flow';
 *
 * function repeat<V>(value: V, count: number): Feed<V> {
 *   return items((async function* () {
 *     for (let i = 0; i < count; i++) { yield value; }
 *   })());
 * }
 *
 * await pipe(
 *   (repeat(42, 3))
 *   (toArray())
 * );  // [42, 42, 42]
 * ```
 *
 * @module
 */

export * from "./items.js";
export * from "./range.js";
export * from "./inlet.js";

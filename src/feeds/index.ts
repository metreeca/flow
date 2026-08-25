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
 * Factory functions that open new feeds from various input sources.
 *
 * Feeds open the {@link index.Feed Feed} a pipe is built on, either adapting values and data sources into one ready
 * for task and sink composition, or combining several feeds into a single one, drawn either in sequence or
 * concurrently. Work is deferred until a sink or a manual iteration consumes the feed.
 *
 * > [!CAUTION]
 * >
 * > When creating custom feeds, always wrap async generators, async generator functions or `AsyncIterable<T>` objects
 * > with {@link feed} to ensure `undefined` filtering and conformance to the {@link index.Feed Feed} contract.
 *
 * **Custom Feeds** are functions opening a feed over a source of their own:
 *
 * ```typescript
 * import { pipe } from '@metreeca/pipe';
 * import { feed } from '@metreeca/pipe/feeds';
 * import { toArray } from '@metreeca/pipe/sinks';
 * import type { Feed } from '@metreeca/pipe';
 *
 * function repeat<V>(value: V, count: number): Feed<V> {
 *   return feed(async function* () {
 *     for (let i = 0; i < count; i++) { yield value; }
 *   }());
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

// generators

export * from "./feed.js";
export * from "./items.js";
export * from "./range.js";
export * from "./iterate.js";

// combinators

export * from "./chain.js";
export * from "./merge.js";

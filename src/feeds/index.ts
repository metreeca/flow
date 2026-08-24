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
 * Factory functions that create new pipes from various input sources.
 *
 * Feeds open a pipeline, either adapting values and data sources into a {@link index.Pipe Pipe} ready for task and
 * sink composition, or combining several sources into one stream, drawn either in sequence or concurrently. Every
 * feed defers all work until a sink consumes the stream.
 *
 * > [!CAUTION]
 * >
 * > When creating custom feeds, always wrap async generators, async generator functions or `AsyncIterable<T>` objects
 * > with {@link data} to ensure `undefined` filtering and proper pipe interface integration.
 *
 * **Custom Feeds** are functions that create new pipes:
 *
 * ```typescript
 * import { pipe } from '@metreeca/pipe';
 * import { data } from '@metreeca/pipe/feeds';
 * import { toArray } from '@metreeca/pipe/sinks';
 * import type { Pipe } from '@metreeca/pipe';
 *
 * function repeat<V>(value: V, count: number): Pipe<V> {
 *   return data(async function* () {
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

export * from "./data.js";
export * from "./items.js";
export * from "./range.js";
export * from "./iterate.js";

// combinators

export * from "./chain.js";
export * from "./merge.js";

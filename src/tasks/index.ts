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
 * Intermediate operations that filter, transform, or process stream items.
 *
 * Tasks apply to a {@link index.Pipe Pipe} and yield a new pipe, so they chain freely into longer pipelines. Items
 * are processed lazily, sequentially and in source order, unless a task reorders them or wraps another to run it
 * concurrently, trading output order for throughput. Tasks buffering the whole stream in memory never complete on
 * infinite sources.
 *
 * **Custom Tasks** are functions that transform async iterables by returning async generator functions:
 *
 * ```typescript
 * import { pipe } from '@metreeca/pipe';
 * import { items } from '@metreeca/pipe/feeds';
 * import { toArray } from '@metreeca/pipe/sinks';
 * import type { Task } from '@metreeca/pipe';
 *
 * function double<V extends number>(): Task<V, V> {
 *   return async function* (source) {
 *     for await (const item of source) { yield item*2 as V; }
 *   };
 * }
 *
 * await pipe(
 *   (items([1, 2, 3]))
 *   (double())
 *   (toArray())
 * );  // [2, 4, 6]
 * ```
 *
 * @module
 */

// operators

export * from "./filter.js";
export * from "./distinct.js";
export * from "./sort.js";
export * from "./skip.js";
export * from "./take.js";
export * from "./peek.js";

// transformers

export * from "./map.js";
export * from "./flatMap.js";
export * from "./batch.js";
export * from "./group.js";

// combinators

export * from "./concurrent.js";

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
 * Terminal operations that consume streams and produce final results.
 *
 * Sinks close a pipeline: applying one to a {@link index.Pipe Pipe} triggers execution and returns a promise
 * resolving to the final result. Those that can decide their outcome early stop consuming rather than draining the
 * source, while those collecting items into a container return it deeply immutable, freezing the container together
 * with the items, keys and values collected into it.
 *
 * **Custom Sinks** are functions that consume async iterables by returning a promise for the final result:
 *
 * ```typescript
 * import { pipe } from '@metreeca/pipe';
 * import { items } from '@metreeca/pipe/feeds';
 * import type { Sink } from '@metreeca/pipe';
 *
 * function sum(): Sink<number, number> {
 *   return async source => {
 *     let total = 0;
 *     for await (const item of source) { total += item; }
 *     return total;
 *   };
 * }
 *
 * await pipe(
 *   (items([1, 2, 3]))
 *   (sum())
 * );  // 6
 * ```
 *
 * @module
 */

// predicates

export * from "./some.js";
export * from "./every.js";

// aggregators

export * from "./count.js";

// extractors

export * from "./find.js";
export * from "./reduce.js";

// collectors

export * from "./toArray.js";
export * from "./toSet.js";
export * from "./toMap.js";
export * from "./toObject.js";
export * from "./toString.js";

// effects

export * from "./forEach.js";

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
 * resolving to the final result. They cover collection ({@link toArray}, {@link toSet}, {@link toMap},
 * {@link toObject}, {@link toString}), aggregation ({@link count}, {@link reduce}, {@link forEach}) and inspection
 * ({@link some}, {@link every}, {@link find}), with the inspection sinks stopping as soon as the outcome is decided
 * rather than draining the source.
 *
 * @module
 */

export * from "./some.js";
export * from "./every.js";
export * from "./count.js";
export * from "./find.js";
export * from "./forEach.js";
export * from "./reduce.js";
export * from "./toArray.js";
export * from "./toSet.js";
export * from "./toMap.js";
export * from "./toObject.js";
export * from "./toString.js";

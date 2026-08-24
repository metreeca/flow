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

import { Pipe } from "../index.js";
import { data } from "./data.js";


/**
 * Creates a pipe from a list of values.
 *
 * Each argument is contributed to the stream as a single item, in argument order, whatever its shape and without
 * being expanded further; `undefined` arguments are dropped as they enter it and an empty argument list opens an
 * empty stream.
 *
 * @typeParam V The type of items in the stream
 *
 * @param values The values to open the stream from
 *
 * @returns A pipe carrying `values` in argument order
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items("a", "b", "c"))
 *   (toArray())
 * );  // ["a", "b", "c"]
 *
 * await pipe(
 *   (items([1, 2], [3, 4]))
 *   (toArray())
 * );  // [[1, 2], [3, 4]], as each argument is contributed whole rather than expanded
 * ```
 *
 * @see {@link data} to open a stream from a source expanded according to its shape
 */
export function items<V>(...values: V[]): Pipe<V> {

	return data(values);

}

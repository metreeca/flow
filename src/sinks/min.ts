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

import { ascending } from "@metreeca/core/order";
import { Sink } from "../index.js";
import { reduce } from "./reduce.js";


/**
 * Creates a sink selecting the least item of the stream.
 *
 * Items are ranked in source order, seeding the result with the first one and retaining only the least ranking item
 * seen so far, so selection stays within constant memory whatever the size of the stream, but never completes on an
 * infinite source; equally ranking items resolve to the first one in source order.
 *
 * An empty stream resolves to `undefined`; callers wanting a default supply it with `??`. As {@link ascending} ranks
 * `null` and `undefined` before any other value and equal to each other, a stream carrying either resolves to the
 * first nullish item, unless the comparator states otherwise: an `undefined` item is thus indistinguishable from an
 * empty stream.
 *
 * > [!TIP]
 * >
 * > The @metreeca/core [order](https://metreeca.github.io/core/modules/order.html) module provides helper functions for
 * > assembling complex ranking criteria.
 *
 * @typeParam V The type of items in the stream
 *
 * @param comparator The function establishing the relative order of two items, defaulting to {@link ascending},
 *   which ranks values in natural order, placing `null` and `undefined` first
 *
 * @returns A sink resolving to the least ranking item of the stream, or to `undefined` if the stream carried no items
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items(3, 1, 2))
 *   (min())
 * );  // 1
 *
 * await pipe(
 *   (items({ age: 30 }, { age: 20 }))
 *   (min(by(x => x.age)))
 * );  // { age: 20 }
 *
 * await pipe(
 *   (items<number>())
 *   (min())
 * );  // undefined
 * ```
 */
export function min<V>(comparator: (a: V, b: V) => number = ascending): Sink<V, undefined | V> {

	return reduce((min: V, item: V) => comparator(item, min) < 0 ? item : min);

}

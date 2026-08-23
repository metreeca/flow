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
import { items } from "./items.js";

/**
 * Creates a pipe that yields a sequence of numbers within a range.
 *
 * Generates numbers in ascending order if `start` < `end`, or descending order if `start` > `end`.
 * Returns an empty sequence if `start` === `end`.
 *
 * @param start The starting value (inclusive)
 * @param end The ending value (exclusive)
 *
 * @returns A pipe yielding numbers from start to end
 *
 * @example
 *
 * ```typescript
 * await range(1, 5)(toArray());   // [1, 2, 3, 4]
 * await range(5, 1)(toArray());   // [5, 4, 3, 2]
 * await range(3, 3)(toArray());   // []
 * ```
 */
export function range(start: number, end: number): Pipe<number> {

	return items((function* () {

		if ( start < end ) {

			for (let i = start; i < end; i++) {
				yield i;
			}

		} else if ( start > end ) {

			for (let i = start; i > end; i--) {
				yield i;
			}

		}

	})());

}

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

import type { Awaitable } from "@metreeca/core/async";
import { Feed } from "../index.js";
import { items } from "./items.js";


/**
 * The end marker a source reports in place of a value to end the feed opened over it.
 *
 * No value a source produces is ever mistaken for the marker, so `undefined`, `null` and every other falsy value stay
 * legal items.
 *
 * @see {@link inlet} to open a feed over an external source of items
 */
export const done: unique symbol = Symbol("done");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a feed over an external source of items, drawn one at a time on demand.
 *
 * Random generators, queues, cursors, event subscriptions and any other source handing over one value per call enter a
 * pipe through this feed, called again once the value it reported last has been consumed. Every value is contributed
 * as a single item, whatever its shape and without being expanded further, so arrays and iterables are carried whole
 * and falsy values, `undefined` included, are preserved; a promised value is awaited before being contributed.
 *
 * The feed ends where the source reports {@link done} in place of a value, the marker itself withheld from the items:
 * a source knowing when it is exhausted bounds the feed at the origin, without a wrapper generator of its own.
 *
 * The optional `signal` bounds the feed from the outside, tested before each call: an aborted signal ends the feed as
 * an exhausted source does, so a deadline or a withdrawn request leaves the items already contributed to the pipe that
 * consumes them. A cancellation asked for while a promised value is in flight takes effect once that value has been
 * contributed, and `signal.aborted` tells a partial outcome from a complete one.
 *
 * > [!WARNING]
 * >
 * > **Infinite**: the feed runs on unless `source` reports {@link done} or `signal` is aborted, so a source that
 * > never ends it leaves it to be bounded downstream, by a task such as {@link tasks.take take} or by a sink
 * > deciding its outcome early.
 *
 * @typeParam V The type of items contributed to the feed
 *
 * @param source The function called repeatedly to produce the next value, reported either as it is or as a promise, or
 *   {@link done} to end the feed
 * @param signal The optional signal bounding the feed from the outside; if omitted, the source alone decides how far
 *   the feed goes
 *
 * @returns A feed yielding the values reported by successive `source` calls, until either the source reports
 *   {@link done} or `signal` is aborted
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (inlet(() => Math.random()))
 *   (take(3))
 *   (toArray())
 * );  // [0.123, 0.456, 0.789]
 *
 * await pipe(
 *   (inlet(() => queue.size ? queue.poll() : done))
 *   (toArray())
 * );  // every value queued, until the queue runs dry
 *
 * await pipe(
 *   (inlet(() => cursor.next(), AbortSignal.timeout(1_000)))
 *   (toArray())
 * );  // every value the cursor reports within the deadline
 * ```
 *
 * @see {@link items} to open a feed from a source contributing its items according to its shape
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal `AbortSignal`}
 */
export function inlet<V>(source: () => Awaitable<V | typeof done>, signal?: AbortSignal): Feed<V> {

	return items((async function* () {

		while ( !signal?.aborted ) { // endless unless bounded, either by the source or by the signal

			const value = await source();

			if ( value === done ) {

				return;

			} else {

				yield value;

			}

		}

	})());

}

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

import { isAsyncIterable, isFunction, isIterable, isString } from "@metreeca/core";
import type { Awaitable, Awaitables } from "@metreeca/core/async";
import { Feed, Sink, Task } from "../index.js";


/**
 * Creates a feed from a data source.
 *
 * The source contributes its items to the feed according to its shape, whatever the declared item type: an iterable or
 * an async iterable contributes the items it yields, an existing feed among them, while any other value is contributed
 * whole as a single item, strings and functions included. A promise is awaited when the feed is consumed, deferring
 * retrieval from APIs, databases or any other asynchronous source until then, and contributes the value it resolves to
 * as a single item, whatever its shape. A feed of iterable items is opened either from a batch listing them or from a
 * promise resolving to one of them.
 *
 * The source is drawn exactly as handed over: a feed opened from a repeatable source, an array or a set among them,
 * is consumed afresh at each pass, while one opened from a source drained by iteration, a generator object among
 * them, runs dry after the first.
 *
 * This is the adapter a custom feed or task reaches for to obtain a feed from a generator object of its own,
 * honouring the {@link index.Feed Feed} contract without assembling one by hand; a source that is itself a feed
 * honours it already and is handed back unchanged, so wrapping is safe to repeat and costs nothing.
 *
 * > [!NOTE]
 * >
 * > **Bounded**: the feed runs dry as `source` does, so a source that never runs dry, an endless generator among
 * > them, opens an infinite feed, to be bounded downstream by a task such as {@link tasks.take take} or by a sink
 * > deciding its outcome early.
 *
 * @typeParam V The type of items contributed to the feed
 *
 * @param source The data source to open the feed from, supplied either as it is or as a promise
 *
 * @returns A feed carrying the items contributed by `source`
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items(new Set([1, 2, 3])))
 *   (toArray())
 * );  // [1, 2, 3], as a batch contributes the items it yields
 *
 * await pipe(
 *   (items("report"))
 *   (toArray())
 * );  // ["report"], as any other value is contributed whole
 *
 * await pipe(
 *   (items(Promise.resolve([1, 2, 3])))
 *   (toArray())
 * );  // [[1, 2, 3]], as the awaited array is contributed whole in turn
 *
 * await pipe(
 *   (items((async function* () { yield* await fetchReport(); })()))
 *   (toArray())
 * );  // the items of the report, drawn once and then run dry
 * ```
 *
 * @see {@link tasks.flat flat} to combine several feeds, carried in a feed of their own, into a single one
 * @see {@link tasks.join join} to combine them as their items become available
 */
export function items<V>(source: Awaitable<V> | Awaitables<V>): Feed<V> {

	function feed<R>(task: Task<V, R>): Feed<R>;
	function feed<R>(sink: Sink<V, R>): Promise<R>;

	function feed<R>(step: Task<V, R> | Sink<V, R>): unknown {

		return step(items(generator()));

	}


	return isFeed<V>(source) ? source // a callable async iterable already honours the feed contract
		: Object.freeze(Object.assign(feed, { [Symbol.asyncIterator]: generator }));


	function isFeed<V>(value: unknown): value is Feed<V> {
		return isFunction(value) && isAsyncIterable<V>(value);
	}

	async function* generator(): AsyncGenerator<V, void, unknown> {

		if ( isString(source) ) {

			yield await source as V;

		} else if ( isAsyncIterable<V>(source) ) {

			yield* source;

		} else if ( isIterable<V>(source) ) {

			yield* source;

		} else {

			yield await source;

		}

	}

}

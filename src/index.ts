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
 * Composable asynchronous iterable processing.
 *
 * Defines the contracts a pipe is assembled from: the {@link Feed} carrying the items, the {@link Task tasks} and
 * {@link Sink sinks} applied to it, and the {@link Data} shapes a feed can be opened from. A pipe composes a feed
 * with any number of tasks and an optional sink, wrapped in the {@link pipe} factory. The companion feed, task and
 * sink modules build on these contracts, and custom operations honouring them compose with the built-in ones
 * interchangeably.
 *
 * > [!IMPORTANT]
 * >
 * > Feeds never carry `undefined`: values are dropped as they enter one, whether contributed by a data source or
 * > yielded by a task, custom ones included, so no task or sink ever observes one. Other falsy values, `null`, `0`,
 * > `false` and `""` among them, are preserved.
 *
 * @module index
 */

import { isFunction } from "@metreeca/core";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Data accepted wherever a feed is opened or extended.
 *
 * Callers supply data in whichever shape is most convenient, each contributing items to the feed as follows:
 *
 * - `readonly V[]` — contributes the items of the array
 * - `Iterable<V>` — contributes the items of the iterable, strings excepted, as they are treated as atomic values and
 *   contributed whole rather than character by character
 * - `AsyncIterable<V>` — contributes the items of the async iterable
 * - {@link Feed}`<V>` — contributes the items of the feed
 *
 * Every shape is a batch of items rather than a single value: a lone value is contributed by wrapping it in an array
 * and an empty batch contributes nothing. Feeds of arrays stay expressible, as `readonly V[]` always denotes the
 * batch rather than one of the values carried by it.
 *
 * Optional values need not be filtered out beforehand: every shape accepts `undefined` entries and drops them as data
 * enters a feed, so a source of `undefined | V` values opens a feed carrying `V` items.
 *
 * The {@link feeds.feed feed} function opens a new feed from this shape; {@link tasks.flatMap flatMap} accepts it to
 * expand each item already carried into further ones.
 *
 * @typeParam V The type of values contributed to the feed
 *
 * @example
 *
 * ```typescript
 * const array: Data<number> = [1, 2, 3];
 * const iterable: Data<number> = new Set([1, 2, 3]);
 * const asynchronous: Data<number> = (async function* () { yield 1; yield 2; })();
 * const feed: Data<number> = items(1, 2, 3);
 * ```
 *
 * @see {@link feeds.items items} to contribute values as they are, without shape inspection
 */
export type Data<V> =
	| readonly (undefined | V)[]
	| Iterable<undefined | V>
	| AsyncIterable<undefined | V>
	| Feed<V>;


/**
 * Feed under composition.
 *
 * A feed is called to advance the pipe: with a {@link Task} to obtain a new feed carrying the transformed values,
 * with a {@link Sink} to consume it and obtain the final result, or without arguments to take over iteration
 * manually. Composition is lazy, as nothing is pulled from the source until a sink or a manual iteration consumes the
 * feed.
 *
 * @typeParam V The type of values in the feed, never `undefined`, as optional values are dropped as data enters it
 */
export interface Feed<V> {

	/**
	 * Applies a transformation task to the feed.
	 *
	 * @typeParam R The type of transformed values, never `undefined`, as optional values are dropped as they re-enter
	 *   the feed
	 *
	 * @param task The task to apply
	 *
	 * @returns A new feed carrying the values `task` yields
	 */<R>(task: Task<V, R>): Feed<R>;

	/**
	 * Applies a terminal sink operation to consume the feed.
	 *
	 * @typeParam R The type of result
	 *
	 * @param sink The sink to apply
	 *
	 * @returns A promise resolving to the sink's result
	 */<R>(sink: Sink<V, R>): Promise<R>;

	/**
	 * Retrieves the underlying async iterable.
	 *
	 * @returns The async iterable for manual iteration
	 */
	(): AsyncIterable<V>;

}

/**
 * Intermediate operation applied to a feed.
 *
 * A task consumes the items of a {@link Feed} and produces new ones, transforming, filtering, reordering or
 * regrouping items along the way; the resulting feed accepts further tasks, so tasks chain into longer pipes.
 *
 * > [!NOTE]
 * >
 * > Optional values need not be filtered out: `undefined` entries are dropped as they re-enter the feed.
 *
 * @typeParam V The type of input values, never `undefined`, as feeds never carry it
 * @typeParam R The type of output values, defaulting to `V` for tasks preserving the item type
 */
export interface Task<V, R = V> {

	/**
	 * Transforms the feed.
	 *
	 * @param values The source values to process
	 *
	 * @returns The transformed values; `undefined` entries are dropped as they re-enter the feed
	 */
	(values: AsyncIterable<V>): AsyncIterable<undefined | R>;

}

/**
 * Terminal operation applied to a feed.
 *
 * A sink consumes the items of a {@link Feed}, driving the pipe that feeds it and resolving to the final result;
 * one able to decide its outcome early may stop consuming before the source runs dry.
 *
 * @typeParam V The type of input values, never `undefined`, as feeds never carry it
 * @typeParam R The type of result, defaulting to `V` for sinks resolving to a feed item
 */
export interface Sink<V, R = V> {

	/**
	 * Consumes the feed.
	 *
	 * @param values The source values to consume
	 *
	 * @returns A promise resolving to the final result
	 */
	(values: AsyncIterable<V>): Promise<R>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a pipe closed by a sink.
 *
 * Wraps a feed, the tasks chained to it and the {@link Sink} closing them into a single expression driving the feed
 * to completion.
 *
 * @typeParam V The type of result the closing sink resolves to
 *
 * @param source The promise returned by the closing sink
 *
 * @returns A promise resolving to the result the closing sink computes over the feed
 */
export function pipe<V>(source: Promise<V>): Promise<V>;

/**
 * Creates a pipe left open.
 *
 * Wraps a feed and the tasks chained to it into a single expression, with no sink to close them, exposing the async
 * iterable underlying the {@link Feed} the composition ends with so that the feed can be consumed manually.
 *
 * @typeParam V The type of values carried by the feed
 *
 * @param source The feed the composition ends with
 *
 * @returns The async iterable underlying `source`
 */
export function pipe<V>(source: Feed<V>): AsyncIterable<V>;

/**
 * Creates a pipe.
 */
export function pipe(source: unknown): unknown {

	return isFunction(source) ? source() : source;

}

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
 * Composable asynchronous stream processing.
 *
 * Defines the contracts a pipeline is assembled from: the pipe carrying a stream, the tasks and sinks applied to it,
 * and the data shapes a stream can be opened from. The companion feed, task and sink modules build on these contracts,
 * and custom operations honouring them compose with the built-in ones interchangeably.
 *
 * > [!IMPORTANT]
 * >
 * > Streams never carry `undefined`: values are dropped both as they enter a pipe and as tasks hand them downstream,
 * > so no task or sink ever observes one, including those yielded by custom tasks. Other falsy values, `null`, `0`,
 * > `false` and `""` among them, are preserved.
 *
 * @module index
 */

import { isFunction } from "@metreeca/core";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Data accepted wherever a stream is opened or extended.
 *
 * Callers supply data in whichever shape is most convenient, each contributing items to the stream as follows:
 *
 * - `undefined` — contributes nothing
 * - `V` — contributes the value itself as a single item
 * - `readonly V[]` — contributes the items of the array
 * - `Iterable<V>` — contributes the items of the iterable, strings excepted, as they are treated as atomic values and
 *   contributed whole rather than character by character
 * - `AsyncIterable<V>` — contributes the items of the async iterable
 * - {@link Pipe}`<V>` — contributes the items of the pipe
 *
 * The {@link feeds.data data} feed accepts this shape to open a stream, as do the feeds combining several sources into
 * one; {@link tasks.flatMap flatMap} accepts it to expand each item of a stream already open into further ones.
 *
 * @typeParam V The type of values contributed to the stream
 *
 * @example
 *
 * ```typescript
 * const scalar: Data<number> = 42;
 * const array: Data<number> = [1, 2, 3];
 * const iterable: Data<number> = new Set([1, 2, 3]);
 * const asynchronous: Data<number> = (async function* () { yield 1; yield 2; })();
 * const piped: Data<number> = items(1, 2, 3);
 * ```
 */
export type Data<V> =
	| V
	| readonly V[]
	| Iterable<V>
	| AsyncIterable<V>
	| Pipe<V>;


/**
 * Stream under composition.
 *
 * A pipe is called to advance the pipeline: with a {@link Task} to obtain a new pipe carrying the transformed stream,
 * with a {@link Sink} to consume it and obtain the final result, or without arguments to take over iteration
 * manually. Composition is lazy, as nothing is pulled from the source until a sink or a manual iteration consumes the
 * stream.
 *
 * @typeParam V The type of values in the stream
 */
export interface Pipe<V> {

	/**
	 * Retrieves the underlying async iterable.
	 *
	 * @returns The async iterable for manual iteration
	 */
	(): AsyncIterable<V>;

	/**
	 * Applies a transformation task to the stream.
	 *
	 * @typeParam R The type of transformed values
	 *
	 * @param task The task to apply
	 *
	 * @returns A new pipe with transformed values
	 */<R>(task: Task<V, R>): Pipe<R>;

	/**
	 * Applies a terminal sink operation to consume the stream.
	 *
	 * @typeParam R The type of result
	 *
	 * @param sink The sink to apply
	 *
	 * @returns A promise resolving to the sink's result
	 */<R>(sink: Sink<V, R>): Promise<R>;

}

/**
 * Intermediate operation applied to a stream.
 *
 * A task consumes the stream of a {@link Pipe} and produces another, transforming, filtering, reordering or
 * regrouping items along the way; the resulting pipe accepts further tasks, so tasks chain into longer pipelines.
 *
 * @typeParam V The type of input values
 * @typeParam R The type of output values, defaulting to `V` for tasks preserving the item type
 */
export interface Task<V, R = V> {

	/**
	 * Transforms the stream.
	 *
	 * @param value The source stream to process
	 *
	 * @returns The transformed stream; yielded `undefined` values are dropped before reaching the next stage
	 */
	(value: AsyncIterable<V>): AsyncIterable<undefined | R>;

}

/**
 * Terminal operation applied to a stream.
 *
 * A sink consumes the stream of a {@link Pipe}, driving the pipeline that feeds it and resolving to the final result;
 * one able to decide its outcome early may stop consuming before the source runs dry.
 *
 * @typeParam V The type of input values
 * @typeParam R The type of result, defaulting to `V` for sinks resolving to a stream item
 */
export interface Sink<V, R = V> {

	/**
	 * Consumes the stream.
	 *
	 * @param value The source stream to consume
	 *
	 * @returns A promise resolving to the final result
	 */
	(value: AsyncIterable<V>): Promise<R>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Processes a promise, returning it as-is.
 *
 * @typeParam V The type of value in the promise
 *
 * @param source The promise to process
 *
 * @returns The same promise
 */
export function pipe<V>(source: Promise<V>): Promise<V>;

/**
 * Processes a pipe, retrieving its underlying async iterable.
 *
 * @typeParam V The type of values in the pipe
 *
 * @param source The pipe to process
 *
 * @returns The underlying async iterable
 */
export function pipe<V>(source: Pipe<V>): AsyncIterable<V>;

/**
 * Processes promises and pipes.
 */
export function pipe(source: unknown): unknown {

	return isFunction(source) ? source() : source;

}

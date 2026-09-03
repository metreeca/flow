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

import { items } from "../feeds/items.js";
import type { Feed, Task } from "../index.js";


/**
 * Creates a task interleaving a feed of feeds into a single feed.
 *
 * Nested feeds are opened as the source yields them and consumed together, each kept one item ahead, so a slow nested
 * feed never holds back the others; the items of every nested feed keep their own order among themselves. A nested
 * feed contributing nothing simply drops out.
 *
 * > [!WARNING]
 * >
 * > - **Incremental**: items are emitted as the nested feeds report them, so the reported feed runs dry as the source
 * >   and its nested feeds do, an infinite nested feed keeping it open without holding back the items of the others.
 * > - **Materialising**: a pending item is held for every nested feed open at the same time, and nothing bounds their
 * >   number, so a source yielding feeds faster than they run dry may exhaust memory; splice with {@link flat}
 * >   instead where the source carries an unbounded number of feeds.
 * > - **Stateless**: nested feeds are interleaved without state carried across them.
 *
 * > [!WARNING]
 * >
 * > Output order is not preserved: items interleave and overtake each other according to how quickly every nested
 * > feed produces them.
 *
 * > [!NOTE]
 * >
 * > Nested feeds failing while the consumer is idle report their error when the feed is next advanced, rather than
 * > escaping as unhandled rejections.
 *
 * > [!NOTE]
 * >
 * > The source and every nested feed still open are closed when the feed is exhausted, fails or is closed early,
 * > waiting for their pending items to settle first, so a feed idling between items delays it; failures reported
 * > while closing are suppressed.
 *
 * @typeParam V The type of items carried by the nested feeds
 *
 * @returns A task yielding the items of every nested feed as they become available
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([slow, fast]))  // slow yields 1, 2; fast yields 3, 4
 *   (join())
 *   (toArray())
 * );  // [3, 4, 1, 2], as the faster feed reports first
 * ```
 *
 * @see {@link flat} to splice the same feeds in source order
 * @see {@link fork} to interleave several runs of a task over the same feed
 */
export function join<V>(): Task<Feed<V>, V>;

/**
 * Creates a task interleaving a feed of feeds into a single feed, processing every nested feed on its own.
 *
 * Interleaves as the overload taking no argument does, handing each nested feed to `task` before its items enter the
 * reported feed, so that a whole pipe is applied within the bounds of a nested feed rather than across the interleaved
 * items.
 *
 * > [!WARNING]
 * >
 * > - **Incremental**: items are emitted as the nested feeds report them, so the reported feed runs dry as the
 * >   source, its nested feeds and `task` do, an infinite nested feed keeping it open without holding back the items
 * >   of the others.
 * > - **Materialising**: a pending item is held for every nested feed open at the same time, and nothing bounds their
 * >   number, so a source yielding feeds faster than they run dry may exhaust memory; splice with {@link flat}
 * >   instead where the source carries an unbounded number of feeds.
 * > - **Stateless**: the interleaving carries no state across nested feeds, whatever `task` carries within each.
 *
 * > [!CAUTION]
 * >
 * > A stateful `task` never sees the whole feed. It is invoked once per nested feed, so state it initialises on
 * > invocation is scoped to that feed alone: {@link distinct} deduplicates within a nested feed, {@link take} yields
 * > its quota to each one and {@link sort} orders each independently. State captured in its enclosing closure is
 * > shared across all of them instead, and reached concurrently.
 * >
 * > Interleave a stateful task only where its outcome is sound on one nested feed at a time; apply it to the
 * > interleaved feed instead, downstream of `join()`, where it is to decide on every item.
 *
 * @typeParam V The type of items carried by the nested feeds
 * @typeParam R The type of items reported by `task`
 *
 * @param task The task applied to each nested feed
 *
 * @returns A task yielding the items `task` reports for every nested feed, as they become available
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([slow, fast]))  // slow yields 1, 2; fast yields 3, 4
 *   (join(map(n => n*10)))
 *   (toArray())
 * );  // [30, 40, 10, 20], as the faster feed reports first
 * ```
 *
 * @see {@link flat} to splice the same feeds in source order
 * @see {@link fork} to interleave several runs of a task over the same feed
 */
export function join<V, R>(task: Task<V, R>): Task<Feed<V>, R>;

/**
 * Creates a task interleaving a feed of feeds, with or without a task processing every nested feed.
 */
export function join<V, R>(task: Task<V, V | R> = feed => feed): Task<Feed<V>, V | R> {

	return source => items((async function* () {

		type Feeds = AsyncIterator<Feed<V>, void, undefined>; // the source, drawn for the feeds it carries
		type Items = AsyncIterator<V | R, void, undefined>; // one nested feed, drawn for the items it reports

		type Event =
			| { kind: "feed", iterator: Feeds, result: IteratorResult<Feed<V>, void> }
			| { kind: "item", iterator: Items, result: IteratorResult<V | R, void> };


		// the source is raced with the feeds it reports, so that a feed opened mid-race joins it at once

		const feeds = source[Symbol.asyncIterator]();
		const polls = new Map<Feeds | Items, Promise<Event>>([[feeds, feed()]]);


		try {

			while ( polls.size > 0 ) {

				yield* process(await Promise.race(polls.values()));

			}

		} finally { // on failure or early termination as well

			await close();

		}


		async function* process(event: Event): AsyncGenerator<V | R, void, undefined> {

			if ( event.result.done ) { // the source reported its last feed, or a nested feed ran dry

				polls.delete(event.iterator);

			} else if ( event.kind === "feed" ) { // a new nested feed: open it and keep drawing from the source

				const iterator = task(event.result.value)[Symbol.asyncIterator]();

				polls.set(iterator, item(iterator));
				polls.set(feeds, feed());

			} else if ( event.kind === "item" ) { // put its feed back to work before yielding, so it draws meanwhile

				polls.set(event.iterator, item(event.iterator));

				yield event.result.value;

			}

		}

		async function close(): Promise<void> {

			await Promise.allSettled([
				...Array.from(polls.keys(), async iterator => iterator.return?.()), // close the source and the feeds
				...polls.values() // suppress late failures from their abandoned polls
			]);

		}

		function feed(): Promise<Event> {

			return guard(feeds.next().then(result =>
				({ kind: "feed", iterator: feeds, result })
			));

		}

		function item(items: Items): Promise<Event> {

			return guard(items.next().then(result =>
				({ kind: "item", iterator: items, result })
			));

		}


		function guard(event: Promise<Event>): Promise<Event> {

			event.catch(() => {}); // suppress unhandled rejection reports while the event waits its turn in the race

			return event;

		}

	})());

}

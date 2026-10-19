/*
 * Copyright © 2026 Metreeca srl
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

import { pipe, type Task } from "../index.js";
import { filter } from "./filter.js";
import { map } from "./map.js";
import { tee } from "./tee.js";


/**
 * Creates a task routing each item to one of two tasks, according to a condition.
 *
 * Each item is tested once and handed to a single task: the first one if it meets the condition, the second one
 * otherwise. The items both tasks report are interleaved into a single feed, each one as soon as it is ready.
 *
 * > [!WARNING]
 * >
 * > - **Incremental**: items are emitted as the tasks report them, until the source and both tasks run dry.
 * > - **Streaming**: one item is on offer at a time and none is retained, whatever the tasks retain.
 * > - **Stateless**: each item is routed on its own, whatever state the tasks carry.
 *
 * > [!WARNING]
 * >
 * > Output order is not preserved: the items of the two tasks interleave and overtake each other according to how long
 * > each task takes, though the items of each task keep their own order among themselves.
 *
 * > [!CAUTION]
 * >
 * > The two tasks draw in lockstep, so a task idling while still running holds back the other one: pacing and
 * > long-running work belong downstream of the routing. A task closing early or running dry stops holding back the
 * > other one, while a task that keeps running without ever drawing its feed stalls the routing for good.
 *
 * > [!NOTE]
 * >
 * > Each task is invoked once and handed only the items routed to it, so state it initialises on invocation decides
 * > on that share alone: a quota or a deduplication covers the items meeting the condition, or the others.
 *
 * > [!NOTE]
 * >
 * > A failure of the condition or of either task is reported by the routed feed when it is next advanced.
 *
 * > [!NOTE]
 * >
 * > Both tasks and the source are closed when the feed is exhausted, fails or is closed early. Closing waits for the
 * > work in flight to settle, so a source idling between items delays it; errors raised while closing are suppressed.
 *
 * @typeParam V The type of items drawn from the feed
 * @typeParam R The type of items reported by the tasks
 *
 * @param test The condition each item is tested against
 * @param pass The task handed the items meeting `test`
 * @param fail The task handed the items failing `test`
 *
 * @returns A task yielding the items both tasks report, as they become available
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([1, 2, 3, 4]))
 *   (when(n => n%2 === 0, map(n => `${n} even`), map(n => `${n} odd`)))
 *   (toArray())
 * );  // "1 odd", "2 even", "3 odd", "4 even", interleaved in no defined order
 * ```
 */
export function when<V, R>(
	test: (value: NoInfer<V>) => boolean,
	pass: Task<NoInfer<V>, R>,
	fail: Task<NoInfer<V>, R>
): Task<V, R> {

	return feed => pipe(feed
		(map(value => ({ value, test: test(value) })))
		(tee(
			routed => pass(routed
				(filter(item => item.test))
				(map(item => item.value))
			),
			routed => fail(routed
				(filter(item => !item.test))
				(map(item => item.value))
			)
		))
	);

}

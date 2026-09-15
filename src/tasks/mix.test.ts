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

import { sleep } from "@metreeca/core/async";
import { describe, expect, it } from "vitest";
import { items } from "../feeds/index.js";
import type { Feed } from "../index.js";
import { toArray } from "../sinks/index.js";
import { mix } from "./mix.js";
import { take } from "./take.js";


/**
 * Creates a feed yielding the given items, one every `ms` milliseconds.
 */
function delayed(ms: number, values: readonly number[]): Feed<number> {
	return items((async function* () {
		for (const value of values) {
			await sleep(ms);
			yield value;
		}
	})());
}

/**
 * Sorts values in ascending order, to compare feeds whose interleaving is not defined.
 */
function ordered(values: readonly number[]): readonly number[] {
	return [...values].sort((x, y) => x-y);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("mix()", () => {

	it("should interleave the sources into the feed drawn", async () => {

		const values = await items([1, 2])(mix(items([3, 4]), items([5, 6])))(toArray());

		expect(ordered(values)).toEqual([1, 2, 3, 4, 5, 6]);

	});

	it("should contribute the items of every source according to its shape", async () => {

		const values = await items([1])(mix(items([2]), [3], Promise.resolve(4), 5))(toArray());

		expect(ordered(values)).toEqual([1, 2, 3, 4, 5]);

	});

	it("should report the items of the feed drawn unchanged when no source is handed over", async () => {

		const values = await items([1, 2, 3])(mix())(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should emit items as they become available", async () => {

		const values = await delayed(30, [1])(mix(delayed(10, [2]), delayed(20, [3])))(toArray());

		expect(values).toEqual([2, 3, 1]);

	});

	it("should preserve the order of the items of the feed drawn and of each source", async () => {

		const values = await delayed(10, [1, 2, 3])(mix(delayed(15, [4, 5, 6])))(toArray());

		expect(values.filter(value => value <= 3)).toEqual([1, 2, 3]);
		expect(values.filter(value => value >= 4)).toEqual([4, 5, 6]);

	});

	it("should draw the sources at their own pace", async () => {

		const values = await delayed(10, [1, 2, 3])(mix(delayed(50, [9])))(toArray());

		expect(values).toEqual([1, 2, 3, 9]); // the slower source delays its own item alone

	});

	it("should run dry only once the feed drawn and every source do", async () => {

		const values = await items([1])(mix(delayed(20, [2]), items([3])))(toArray());

		expect(ordered(values)).toEqual([1, 2, 3]);

	});

	it("should close the feed drawn and every source on early termination", async () => {

		const closed: string[] = [];

		const tracked = (name: string): Feed<number> => items((async function* () {
			try {
				await sleep(10); // let every source be opened before any item is drawn
				yield 1;
				yield 2;
			} finally {
				closed.push(name);
			}
		})());

		const feed = tracked("source")(mix(tracked("a"), tracked("b")));
		const iterator = feed[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		expect([...closed].sort()).toEqual(["a", "b", "source"]);

	});

	it("should report the failure of a source", async () => {

		const failing: Feed<number> = items((async function* (): AsyncGenerator<number> {
			await sleep(10);
			throw new Error("source failed");
		})());

		await expect(items([1])(mix(failing))(toArray()))
			.rejects.toThrow("source failed");

	});

	it("should report the failure of the feed drawn", async () => {

		const failing: Feed<number> = items((async function* (): AsyncGenerator<number> {
			await sleep(10);
			throw new Error("feed failed");
		})());

		await expect(failing(mix(items([1])))(toArray()))
			.rejects.toThrow("feed failed");

	});

	it("should report a failure raised while the consumer is idle on the next advance", async () => {

		const unhandled: unknown[] = [];
		const collect = (reason: unknown) => unhandled.push(reason);

		const failing: Feed<number> = items((async function* () {
			yield 1;
			await sleep(10); // the source fails after handing over the item
			throw new Error("source failed");
		})());

		const iterator = items<number>([])(mix(failing))[Symbol.asyncIterator]();

		process.on("unhandledRejection", collect);

		try {

			await iterator.next();
			await sleep(50); // the consumer stays idle while the source fails

			expect(unhandled).toEqual([]);

			await expect(iterator.next()).rejects.toThrow("source failed");

		} finally {

			process.off("unhandledRejection", collect);

		}

	});

	it("should contribute the items of a repeatable source at every application", async () => {

		const task = mix<number, number>(items([2, 3]));

		const first = await items([1])(task)(toArray());
		const second = await items([1])(task)(toArray());

		expect(ordered(first)).toEqual([1, 2, 3]);
		expect(ordered(second)).toEqual([1, 2, 3]);

	});

	it("should contribute the items of a source drained by iteration on the first application alone", async () => {

		const task = mix<number, number>((async function* () { yield 2; yield 3; })());

		const first = await items([1])(task)(toArray());
		const second = await items([1])(task)(toArray());

		expect(ordered(first)).toEqual([1, 2, 3]);
		expect(second).toEqual([1]);

	});

	it("should bound the feed drawn and the sources alike downstream", async () => {

		const values = await delayed(10, [1, 2, 3])(mix(delayed(15, [4, 5, 6])))(take(2))(toArray());

		expect(values.length).toEqual(2);

	});

});

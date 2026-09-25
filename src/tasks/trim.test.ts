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

import { describe, expect, it } from "vitest";
import { inlet, items } from "../feeds/index.js";
import { pipe } from "../index.js";
import { toArray } from "../sinks/index.js";
import { map } from "./map.js";
import { take } from "./take.js";
import { trim } from "./trim.js";


describe("trim()", () => {

	it("should drop undefined items wherever they occur", async () => {

		const values = await items([undefined, 1, undefined, 2, undefined])(trim())(toArray());

		expect(values).toEqual([1, 2]);

	});

	it("should retain null and other falsy items", async () => {

		const values = await items([0, "", false, null, NaN, undefined])(trim())(toArray());

		expect(values).toEqual([0, "", false, null, NaN]);

	});

	it("should handle an empty source", async () => {

		const values = await items<undefined | number>([])(trim())(toArray());

		expect(values).toEqual([]);

	});

	it("should handle a source of undefined items only", async () => {

		const values = await items<undefined | number>([undefined, undefined])(trim())(toArray());

		expect(values).toEqual([]);

	});

	it("should emit items as they are drawn", async () => {

		const count = { next: 0 };

		const values = await pipe( // an infinite source completes, as it is trimmed item by item
			(inlet(() => count.next++%2 ? count.next : undefined))
			(trim())
			(take(3))
			(toArray())
		);

		expect(values).toEqual([2, 4, 6]);

	});

	it("should propagate failures of the source", async () => {

		const failing = items((async function* (): AsyncGenerator<undefined | number> {
			yield 1;
			throw new Error("source failed");
		})());

		await expect(failing(trim())(toArray())).rejects.toThrow("source failed");

	});


	describe("with a task", () => {

		it("should drop the undefined items the task reports", async () => {

			const values = await items([1, 2, 3, 4])(trim(map(n => n%2 ? n*10 : undefined)))(toArray());

			expect(values).toEqual([10, 30]);

		});

		it("should report the type of the items the task reports", async () => {

			const values = await items([1, 2])(trim(map(n => n%2 ? `<${n}>` : undefined)))(toArray());

			expect(values).toEqual(["<1>"]);

		});

		it("should draw the task from the whole feed", async () => {

			const values = await items([undefined, 1, 2])(trim(take(2)))(toArray());

			expect(values).toEqual([1]); // the quota is spent on the items drawn, undefined ones included

		});

		it("should await asynchronous mappers", async () => {

			const values = await items([1, 2, 3])(trim(map(async n => n%2 ? n : undefined)))(toArray());

			expect(values).toEqual([1, 3]);

		});

		it("should handle an empty source", async () => {

			const values = await items<number>([])(trim(map(n => n)))(toArray());

			expect(values).toEqual([]);

		});

		it("should propagate task failures", async () => {

			await expect(items([1, 2])(trim(map(n => {
				if ( n === 2 ) { throw new Error("task failed"); }
				return n;
			})))(toArray())).rejects.toThrow("task failed");

		});

	});

});

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
import { toArray } from "../sinks/index.js";
import { map } from "./map.js";
import { peek } from "./peek.js";


describe("peek()", () => {

	it("should hand every item to the consumer, emitting it unchanged", async () => {

		const observed: number[] = [];

		const values = await items([1, 2, 3])(peek(x => {
			observed.push(x);
		}))(toArray());

		expect(observed).toEqual([1, 2, 3]);
		expect(values).toEqual([1, 2, 3]);

	});

	it("should hold the item back until an asynchronous consumer completes", async () => {

		const order: string[] = [];

		const values = await items([1, 2])(peek(async x => {
			await sleep(10);
			order.push(`observe:${x}`);
		}))(map(x => {
			order.push(`emit:${x}`);
			return x;
		}))(toArray());

		expect(order).toEqual(["observe:1", "emit:1", "observe:2", "emit:2"]);
		expect(values).toEqual([1, 2]);

	});

	it("should emit nothing for an empty feed", async () => {

		const observed: number[] = [];

		const values = await items<number>([])(peek(x => {
			observed.push(x);
		}))(toArray());

		expect(observed).toEqual([]);
		expect(values).toEqual([]);

	});

	it("should propagate consumer failures", async () => {

		await expect(items([1, 2, 3])(peek(x => {
			if ( x === 2 ) { throw new Error("consumer failed"); }
		}))(toArray())).rejects.toThrow("consumer failed");

	});

});

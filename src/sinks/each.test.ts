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
import { peek } from "../tasks/index.js";
import { each } from "./each.js";


describe("each()", () => {

	it("should hand every item to the consumer in source order, resolving to their count", async () => {

		const handled: number[] = [];

		const count = await items([1, 2, 3])(each(x => {
			handled.push(x);
		}));

		expect(handled).toEqual([1, 2, 3]);
		expect(count).toBe(3);

	});

	it("should hand items over one at a time, awaiting asynchronous consumers", async () => {

		const order: string[] = [];

		const count = await items([1, 2])(peek(x => {
			order.push(`draw:${x}`);
		}))(each(async x => {
			await sleep(10);
			order.push(`handle:${x}`);
		}));

		expect(order).toEqual(["draw:1", "handle:1", "draw:2", "handle:2"]);
		expect(count).toBe(2);

	});

	it("should resolve to zero for an empty feed", async () => {

		const handled: number[] = [];

		const count = await items<number>([])(each(x => {
			handled.push(x);
		}));

		expect(handled).toEqual([]);
		expect(count).toBe(0);

	});

	it("should propagate consumer failures", async () => {

		await expect(items([1, 2, 3])(each(x => {
			if ( x === 2 ) { throw new Error("consumer failed"); }
		}))).rejects.toThrow("consumer failed");

	});

});

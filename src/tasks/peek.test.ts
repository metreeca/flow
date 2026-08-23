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
import { items } from "../feeds/index.js";
import { toArray } from "../sinks/index.js";
import { peek } from "./peek.js";


describe("peek()", () => {

	it("should execute side effect for each item", async () => {

		const sideEffects: number[] = [];
		const values = await items([1, 2, 3])(peek(x => {
			sideEffects.push(x*10);
		}))(toArray());

		expect(values).toEqual([1, 2, 3]);
		expect(sideEffects).toEqual([10, 20, 30]);

	});

	it("should support async consumers", async () => {

		const sideEffects: number[] = [];
		const values = await items([1, 2, 3])(peek(async x => {
			await Promise.resolve();
			sideEffects.push(x);
		}))(toArray());

		expect(values).toEqual([1, 2, 3]);
		expect(sideEffects).toEqual([1, 2, 3]);

	});

});

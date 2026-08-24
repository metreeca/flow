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
 * Internal utilities shared across modules.
 *
 * @internal
 * @module
 */

import { isAsyncIterable, isFunction, isIterable, isString } from "@metreeca/core";
import { Data } from "./index.js";


/**
 * Flattens a {@link index.Data Data} value into the items it contributes to a stream.
 *
 * Strings are treated as atomic values and yielded whole rather than character by character, as they stand for single
 * data items rather than character sequences; every other non-iterable value is likewise yielded as a single item.
 *
 * @internal
 */
export async function* flatten<R>(data: Data<R>): AsyncGenerator<R, void, unknown> {

	if ( isString(data) ) {

		yield data as R;

	} else if ( isFunction(data) ) {

		yield* data();

	} else if ( isAsyncIterable<R>(data) ) {

		yield* data;

	} else if ( isIterable<undefined | R>(data) ) {

		yield* data;

	} else {

		yield data;

	}

}

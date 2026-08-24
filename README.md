# @metreeca/pipe

[![npm](https://img.shields.io/npm/v/@metreeca/pipe)](https://www.npmjs.com/package/@metreeca/pipe)

A lightweight TypeScript library for composable async iterable processing.

**@metreeca/pipe** provides an idiomatic, easy-to-use functional API for working with async iterables through pipes,
tasks, and sinks. The composable design enables building complex data processing pipelines with full type safety and
minimal boilerplate. Key features include:

- **Focused API**: small set of operators covering common async iterable use cases
- **Natural Syntax**: readable pipeline composition through nested calls wrapped in `pipe()`
- **Type Safety**: seamless type inference across pipeline stages and automatic `undefined` filtering
- **Task/Sink Pattern**: clear separation between transformations and terminal operations
- **Concurrency Control**: any task run concurrently over the stream, under an explicit bound on the items in flight
- **Extensible Design**: easy creation of custom feeds, tasks, and sinks

# Installation

```shell
npm install @metreeca/pipe
```

> [!WARNING]
>
> TypeScript consumers must use `"moduleResolution": "nodenext"/"node16"/"bundler"` in `tsconfig.json`.
> The legacy `"node"` resolver is not supported.

# Core Usage

> [!NOTE]
>
> This section introduces essential concepts and common patterns: see the
> [API reference](https://metreeca.github.io/pipe/) for complete coverage.

**@metreeca/pipe** provides four main abstractions:

- **[Pipes](https://metreeca.github.io/pipe/modules/index.html)**: functional interface for composing async stream
  operations
- **[Feeds](https://metreeca.github.io/pipe/modules/feeds.html)**: factory functions that open new pipes from various
  input sources
- **[Tasks](https://metreeca.github.io/pipe/modules/tasks.html)**: intermediate operations that transform, filter, or
  process stream items
- **[Sinks](https://metreeca.github.io/pipe/modules/sinks.html)**: terminal operations that consume streams and produce
  final results

## Creating Feeds

Create [feeds](https://metreeca.github.io/pipe/modules/feeds.html) from various data sources.

```typescript
import { range, items, chain, merge, iterate } from '@metreeca/pipe/feeds';

items(42);                    // from single values
items(1, 2, 3, 4, 5);         // from multiple scalar values
items([1, 2, 3, 4, 5]);       // from arrays
items(new Set([1, 2, 3]));    // from iterables
items(asyncGenerator());      // from async iterables
items(fetchReport());         // from promises, awaited on consumption
items(items([1, 2, 3]));      // from other pipes
range(10, 0);                 // from numeric ranges

iterate(() => Math.random()); // from repeated generator calls

chain(                        // sequential consumption
	items([1, 2, 3]),
	items([4, 5, 6])
);

merge(                        // concurrent consumption
	items([1, 2, 3]),
	items([4, 5, 6])
);
```

## Transforming Data

Chain [tasks](https://metreeca.github.io/pipe/modules/tasks.html) to transform, filter, and process items.

> [!TIP]
>
> The @metreeca/core [order](https://metreeca.github.io/core/modules/order.html) module provides helper functions for
> assembling complex sorting criteria.

```typescript
import { pipe } from "@metreeca/pipe";
import { items } from "@metreeca/pipe/feeds";
import { toArray } from "@metreeca/pipe/sinks";
import { by } from "@metreeca/core/order";
import { batch, distinct, filter, flatMap, group, map, peek, skip, sort, take } from "@metreeca/pipe/tasks";

await pipe(
	(items([1, 2, 3, 4, 5]))
	(filter(n => n%2 === 0))
	(toArray())
);  // [2, 4]

await pipe(
	(items([1, 2, 2, 3, 1]))
	(distinct())
	(toArray())
);  // [1, 2, 3]

await pipe(
	(items([3, 1, 4, 1, 5]))
	(sort())
	(toArray())
);  // [1, 1, 3, 4, 5]

await pipe(
	(items([{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }]))
	(sort(by(x => x.age)))
	(toArray())
);  // [{ name: "Bob", age: 25 }, { name: "Alice", age: 30 }]

await pipe(
	(items([1, 2, 3, 4, 5]))
	(skip(2))
	(toArray())
);  // [3, 4, 5]

await pipe(
	(items([1, 2, 3, 4, 5]))
	(take(3))
	(toArray())
);  // [1, 2, 3]

await pipe(
	(items([1, 2, 3]))
	(peek(n => console.log(n)))
	(toArray())
);  // logs 1, 2, 3; [1, 2, 3]

await pipe(
	(items([1, 2, 3]))
	(map(n => n*2))
	(toArray())
);  // [2, 4, 6]

await pipe(
	(items([1, 2, 3]))
	(flatMap(n => [n, n*10]))
	(toArray())
);  // [1, 10, 2, 20, 3, 30]

await pipe(
	(items([1, 2, 3, 4, 5]))
	(batch(2))
	(toArray())
);  // [[1, 2], [3, 4], [5]]

await pipe(
	(items([1, 2, 3, 4, 5]))
	(group(n => n%2))
	(toArray())
);  // [[1, [1, 3, 5]], [0, [2, 4]]]
```

## Consuming Data

Apply [sinks](https://metreeca.github.io/pipe/modules/sinks.html) as terminal operations that consume pipes and return
promises with final results. Collection sinks (`toArray()`, `toSet()`, `toMap()`, `toObject()`) return deeply immutable
results, freezing both the container and the items, keys and values collected into it.

```typescript
import { items } from '@metreeca/pipe/feeds';
import {
	count, every, find, forEach, reduce, some, toArray, toMap, toObject, toSet, toString
} from '@metreeca/pipe/sinks';
import { pipe } from '@metreeca/pipe';

await pipe(
	(items([1, 2, 3]))
	(some(n => n > 2))
);  // true

await pipe(
	(items([2, 4, 6]))
	(every(n => n%2 === 0))
);  // true

await pipe(
	(items([1, 2, 3, 4, 5]))
	(count())
);  // 5

await pipe(
	(items([1, 2, 3, 4]))
	(find(n => n > 2))
);  // 3

await pipe(
	(items([1, 2, 3, 4]))
	(reduce((total, n) => total+n, 0))
);  // 10

await pipe(
	(items([1, 2, 3]))
	(toArray())
);  // [1, 2, 3]

await pipe(
	(items([1, 2, 2, 3]))
	(toSet())
);  // Set(3) { 1, 2, 3 }

await pipe(
	(items([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]))
	(toMap(x => x.id, x => x.name))
);  // Map(2) { 1 => "Alice", 2 => "Bob" }

await pipe(
	(items([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]))
	(toObject(x => x.id, x => x.name))
);  // { 1: "Alice", 2: "Bob" }

await pipe(
	(items([1, 2, 3]))
	(toString(" - "))
);  // "1 - 2 - 3"

await pipe(
	(items([1, 2, 3]))
	(forEach(n => console.log(n)))
);  // logs 1, 2, 3; 3
```

Alternatively, call `pipe()` without a sink to get the underlying async iterable for manual iteration.

```typescript
import { items } from '@metreeca/pipe/feeds';
import { filter } from '@metreeca/pipe/tasks';
import { pipe } from '@metreeca/pipe';

const iterable = pipe(
	(items([1, 2, 3]))
	(filter(n => n > 1))
);  // AsyncIterable<number>

for await (const value of iterable) {
	console.log(value);  // 2, 3
}
```

# Advanced Usage

## Concurrent Processing

Wrap any task with `concurrent()` to interleave several runs of it over the same stream: the runs draw from the same
source, each item going to exactly one of them, and results are emitted as soon as they are ready rather than in
source order.

```typescript
import { items } from '@metreeca/pipe/feeds';
import { concurrent } from '@metreeca/pipe/tasks';
import { toArray } from '@metreeca/pipe/sinks';
import { pipe } from '@metreeca/pipe';

await pipe( // at most 4 items in flight
	(items(ids))
	(concurrent(4, retrieve()))
	(toArray())
);
```

Runs are interleaved on the event loop rather than executed in parallel: the concurrency bounds the asynchronous
operations overlapping at any time, not the computation carried out simultaneously, so running a task that blocks the
event loop concurrently buys nothing.

The concurrency bounds how far the task reads ahead of the downstream consumer, so it controls memory usage and
backpressure, not the rate at which work is submitted. All runs start together when the stream is opened, so the task
is invoked exactly as many times as the concurrency, whether or not the source is fast enough to keep every run busy.

The concurrency must be an integer, otherwise a `TypeError` is thrown; values less than 1 are treated as 1, that is,
as sequential processing.

The concurrent task is a single function invoked once per run: state it initialises on invocation, as `distinct()`,
`sort()`, `take()`, `skip()`, `batch()` and `group()` do, is tracked per run rather than across the stream as a whole,
while state captured in its enclosing closure is shared by every run and accessed concurrently. Run only tasks that
keep no state across items.

Control the rate at which work is submitted with utilities from the @metreeca/core
[async](https://metreeca.github.io/core/modules/async.html) module, such as throttling:

```typescript
import { createThrottle } from "@metreeca/core/async";
import { pipe } from "@metreeca/pipe";
import { items } from "@metreeca/pipe/feeds";
import { forEach } from "@metreeca/pipe/sinks";
import { concurrent } from "@metreeca/pipe/tasks";

const throttle = createThrottle({ minimum: 1000 });  // limit to max 1 request per second

await pipe(
	(items(ids))
	(concurrent(4, retrieve(throttle)))  // inject delays to enforce the rate limit
	(forEach(x => console.log(x)))
);
```

## Working with Infinite Feeds

Use `iterate()` to open infinite feeds from generator functions. Items are pulled lazily, so an infinite feed is
consumed only as far as the pipeline demands: bound it with a task like `take()`, or with a sink deciding its outcome
early, such as `some()`, `every()` or `find()`.

Tasks draining the whole stream before emitting anything, namely `sort()`, `group()` and an unbounded `batch()`, and
sinks collecting it into a container never complete on an infinite feed: place a bound upstream of them.

```typescript
import { iterate } from '@metreeca/pipe/feeds';
import { filter, take } from '@metreeca/pipe/tasks';
import { forEach } from '@metreeca/pipe/sinks';
import { pipe } from '@metreeca/pipe';

await pipe(
	(iterate(() => Math.random()))
	(filter(n => n > 0.5))
	(take(3))
	(forEach(n => console.info(n)))
);
```

## Creating Custom Feeds

Feeds are functions that create new pipes.

```typescript
import { pipe } from '@metreeca/pipe';
import { items } from '@metreeca/pipe/feeds';
import { toArray } from '@metreeca/pipe/sinks';
import type { Pipe } from '@metreeca/pipe';

function repeat<V>(value: V, count: number): Pipe<V> {
	return items(async function* () {
		for (let i = 0; i < count; i++) { yield value; }
	}());
}

await pipe(
	(repeat(42, 3))
	(toArray())
);  // [42, 42, 42]
```

> [!CAUTION]
>
> When creating custom feeds, always wrap async generators, async generator functions, or `AsyncIterable<T>` objects
> with [`items()`](https://metreeca.github.io/pipe/functions/items.html) to ensure `undefined` filtering and proper
> pipe interface integration.

## Creating Custom Tasks

Tasks are functions that transform async iterables. Create custom tasks by returning an async generator function.

```typescript
import { pipe } from '@metreeca/pipe';
import { items } from '@metreeca/pipe/feeds';
import { toArray } from '@metreeca/pipe/sinks';
import type { Task } from '@metreeca/pipe';

function double<V extends number>(): Task<V, V> {
	return async function* (source) {
		for await (const item of source) { yield item*2 as V; }
	};
}

await pipe(
	(items([1, 2, 3]))
	(double())
	(toArray())
);  // [2, 4, 6]
```

## Creating Custom Sinks

Sinks are functions that consume async iterables and return a promise for the final result.

```typescript
import { pipe } from '@metreeca/pipe';
import { items } from '@metreeca/pipe/feeds';
import type { Sink } from '@metreeca/pipe';

function sum(): Sink<number, number> {
	return async source => {

		let total = 0;

		for await (const item of source) { total += item; }

		return total;
	};
}

await pipe(
	(items([1, 2, 3]))
	(sum())
);  // 6
```

# Support

- open an [issue](https://github.com/metreeca/pipe/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/pipe/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/pipe?tab=Apache-2.0-1-ov-file) file for details.

# @metreeca/flow

[![npm](https://img.shields.io/npm/v/@metreeca/flow)](https://www.npmjs.com/package/@metreeca/flow)

Composable pipes over async iterables.

**@metreeca/flow** provides an idiomatic, easy-to-use functional API for working with async iterables through feeds,
tasks, and sinks. The composable design enables building complex data processing pipes with full type safety and
minimal boilerplate. Key features include:

- **Focused API**: small set of operators covering common async iterable use cases
- **Natural Syntax**: readable pipe composition through nested calls wrapped in `pipe()`
- **Type Safety**: seamless type inference across pipe stages and automatic `undefined` filtering
- **Feed/Task/Sink Pattern**: symmetric contracts for opening, transforming and consuming feeds
- **Concurrency Control**: any task run concurrently over the feed, under an explicit bound on the items in flight
- **Extensible Design**: easy creation of custom feeds, tasks, and sinks

# Installation

```shell
npm install @metreeca/flow
```

> [!WARNING]
>
> TypeScript consumers must use `"moduleResolution": "nodenext"/"node16"/"bundler"` in `tsconfig.json`.
> The legacy `"node"` resolver is not supported.

# Core Usage

> [!NOTE]
>
> This section introduces essential concepts and common patterns: see the
> [API reference](https://metreeca.github.io/flow/) for complete coverage.

**@metreeca/flow** builds on three symmetric [abstractions](https://metreeca.github.io/flow/modules/index.html):

- **[Feeds](https://metreeca.github.io/flow/modules/feeds.html)**: factory functions that open a feed from values,
  data sources or other feeds
- **[Tasks](https://metreeca.github.io/flow/modules/tasks.html)**: intermediate operations that transform, filter, or
  process feed items
- **[Sinks](https://metreeca.github.io/flow/modules/sinks.html)**: terminal operations that consume feeds and produce
  final results

A **pipe** composes a feed, any number of tasks and an optional sink, wrapped in `pipe()`. Closed by a sink, it resolves
to the final result; left open, it yields the async iterable underlying its final feed for manual iteration.

## Creating Feeds

Start a pipe with a [feed](https://metreeca.github.io/flow/modules/feeds.html), either adapting values and data sources
or combining several feeds into one.

### Generators

Open a feed over values, ranges or repeated generator calls.

```typescript
import { feed, items, iterate, range } from '@metreeca/flow/feeds';

items(1, 2, 3, 4, 5);           // from values contributed as they are
feed([1, 2, 3, 4, 5]);          // from arrays
feed(new Set([1, 2, 3]));       // from iterables
feed(asyncGenerator());         // from async iterables
feed(fetchReport());            // from promises, awaited on consumption
feed(items(1, 2, 3));           // from other feeds
range(10, 0);                   // from numeric ranges

iterate(() => Math.random());   // from repeated generator calls
```

### Combinators

Open a feed over the items of several feeds, drawn either in sequence or concurrently.

```typescript
import { chain, merge } from '@metreeca/flow/feeds';

chain(                        // sequential consumption
	items(1, 2, 3),
	items(4, 5, 6)
);

merge(                        // concurrent consumption
	items(1, 2, 3),
	items(4, 5, 6)
);
```

## Transforming Data

Chain [tasks](https://metreeca.github.io/flow/modules/tasks.html) to reshape the feed and map its items.

### Operators

Select, reorder and inspect items, leaving their type unchanged.

> [!TIP]
>
> The @metreeca/core [order](https://metreeca.github.io/core/modules/order.html) module provides helper functions for
> assembling complex sorting criteria.

```typescript
import { distinct, filter, peek, skip, sort, take } from '@metreeca/flow/tasks';

await pipe(
	(items(1, 2, 3, 4, 5))
	(filter(n => n%2 === 0))
	(toArray())
);  // [2, 4]

await pipe(
	(items(1, 2, 2, 3, 1))
	(distinct())
	(toArray())
);  // [1, 2, 3]

await pipe(
	(items(3, 1, 4, 1, 5))
	(sort())
	(toArray())
);  // [1, 1, 3, 4, 5]

await pipe(
	(items({ name: "Alice", age: 30 }, { name: "Bob", age: 25 }))
	(sort(by(x => x.age)))
	(toArray())
);  // [{ name: "Bob", age: 25 }, { name: "Alice", age: 30 }]

await pipe(
	(items(1, 2, 3, 4, 5))
	(skip(2))
	(toArray())
);  // [3, 4, 5]

await pipe(
	(items(1, 2, 3, 4, 5))
	(take(3))
	(toArray())
);  // [1, 2, 3]

await pipe(
	(items(1, 2, 3))
	(peek(n => console.log(n)))
	(toArray())
);  // logs 1, 2, 3; [1, 2, 3]
```

### Transformers

Map items to values of a different type, either one by one or in groups.

```typescript
import { batch, flatMap, group, map } from '@metreeca/flow/tasks';

await pipe(
	(items(1, 2, 3))
	(map(n => n*2))
	(toArray())
);  // [2, 4, 6]

await pipe(
	(items(1, 2, 3))
	(flatMap(n => [n, n*10]))
	(toArray())
);  // [1, 10, 2, 20, 3, 30]

await pipe(
	(items(1, 2, 3, 4, 5))
	(batch(2))
	(toArray())
);  // [[1, 2], [3, 4], [5]]

await pipe(
	(items(1, 2, 3, 4, 5))
	(group(n => n%2))
	(toArray())
);  // [[1, [1, 3, 5]], [0, [2, 4]]]
```

## Consuming Data

Apply [sinks](https://metreeca.github.io/flow/modules/sinks.html) as terminal operations that consume feeds and
return promises with final results.

### Predicates

Test the feed against a condition, stopping as soon as the outcome is decided.

```typescript
import { every, some } from '@metreeca/flow/sinks';

await pipe(
	(items(1, 2, 3))
	(some(n => n > 2))
);  // true

await pipe(
	(items(2, 4, 6))
	(every(n => n%2 === 0))
);  // true
```

### Aggregators

Reduce the feed to a single value, resolving to `undefined` on an empty feed where no result is defined. `sum()`
and `avg()` handle `number` and `bigint` feeds alike, rounding `bigint` means to the nearest integer, halves away
from zero. `min()` and `max()` rank items with the same comparators as `sort()`, resolving to the first of equally
ranking ones.

> [!TIP]
>
> The @metreeca/core [order](https://metreeca.github.io/core/modules/order.html) module provides helper functions for
> assembling complex ranking criteria.

```typescript
import { avg, count, max, min, sum } from '@metreeca/flow/sinks';

await pipe(
	(items(1, 2, 3, 4, 5))
	(count())
);  // 5

await pipe(
	(items(1, 2, 3, 4, 5))
	(sum())
);  // 15

await pipe(
	(items(1, 2, 3, 4))
	(avg())
);  // 2.5

await pipe(
	(items(1n, 2n, 4n))
	(avg())
);  // 2n

await pipe(
	(items(3, 1, 4, 1, 5))
	(min())
);  // 1

await pipe(
	(items({ name: "Alice", age: 30 }, { name: "Bob", age: 25 }))
	(max(by(x => x.age)))
);  // { name: "Alice", age: 30 }
```

### Extractors

Retrieve a single item from the feed or fold it into a value of an arbitrary type.

```typescript
import { find, reduce } from '@metreeca/flow/sinks';

await pipe(
	(items(1, 2, 3, 4))
	(find(n => n > 2))
);  // 3

await pipe(
	(items(1, 2, 3, 4))
	(reduce((total, n) => total+n, 0))
);  // 10
```

### Collectors

Collect items into a container. The result is deeply immutable, freezing both the container and the items, keys and
values collected into it.

```typescript
import { toArray, toMap, toObject, toSet, toString } from '@metreeca/flow/sinks';

await pipe(
	(items(1, 2, 3))
	(toArray())
);  // [1, 2, 3]

await pipe(
	(items(1, 2, 2, 3))
	(toSet())
);  // Set(3) { 1, 2, 3 }

await pipe(
	(items({ id: 1, name: "Alice" }, { id: 2, name: "Bob" }))
	(toMap(x => x.id, x => x.name))
);  // Map(2) { 1 => "Alice", 2 => "Bob" }

await pipe(
	(items({ id: 1, name: "Alice" }, { id: 2, name: "Bob" }))
	(toObject(x => x.id, x => x.name))
);  // { 1: "Alice", 2: "Bob" }

await pipe(
	(items(1, 2, 3))
	(toString(" - "))
);  // "1 - 2 - 3"
```

### Effects

Consume the feed for its side effects, resolving to the number of items processed.

```typescript
import { forEach } from '@metreeca/flow/sinks';

await pipe(
	(items(1, 2, 3))
	(forEach(n => console.log(n)))
);  // logs 1, 2, 3; 3
```

# Advanced Usage

## Manual Iteration

Call `pipe()` without a sink to get the underlying async iterable and drive the pipe directly, pulling items as the
surrounding code is ready for them.

```typescript
import { items } from '@metreeca/flow/feeds';
import { filter } from '@metreeca/flow/tasks';
import { pipe } from '@metreeca/flow';

const iterable = pipe(
	(items(1, 2, 3))
	(filter(n => n > 1))
);  // AsyncIterable<number>

for await (const value of iterable) {
	console.log(value);  // 2, 3
}
```

## Concurrent Processing

Wrap any task with `concurrent()` to interleave several runs of it over the same feed: the runs draw from the same
source, each item going to exactly one of them, and results are emitted as soon as they are ready rather than in
source order.

```typescript
import { feed } from '@metreeca/flow/feeds';
import { concurrent } from '@metreeca/flow/tasks';
import { toArray } from '@metreeca/flow/sinks';
import { pipe } from '@metreeca/flow';

await pipe( // at most 4 items in flight
	(feed(ids))
	(concurrent(4, retrieve()))
	(toArray())
);
```

Runs are interleaved on the event loop rather than executed in parallel: the concurrency bounds the asynchronous
operations overlapping at any time, not the computation carried out simultaneously, so running a task that blocks the
event loop concurrently buys nothing.

The concurrency bounds how far the task reads ahead of the downstream consumer, so it controls memory usage and
backpressure, not the rate at which work is submitted. All runs start together when the feed is opened, so the task
is invoked exactly as many times as the concurrency, whether or not the source is fast enough to keep every run busy.

The concurrency must be an integer, otherwise a `TypeError` is thrown; values less than 1 are treated as 1, that is,
as sequential processing.

The concurrent task is a single function invoked once per run: state it initialises on invocation, as `distinct()`,
`sort()`, `take()`, `skip()`, `batch()` and `group()` do, is tracked per run rather than across the feed as a whole,
while state captured in its enclosing closure is shared by every run and accessed concurrently. Run only tasks that
keep no state across items.

Control the rate at which work is submitted with utilities from the @metreeca/core
[async](https://metreeca.github.io/core/modules/async.html) module, such as throttling:

```typescript
import { createThrottle } from "@metreeca/core/async";
import { pipe } from "@metreeca/flow";
import { feed } from "@metreeca/flow/feeds";
import { forEach } from "@metreeca/flow/sinks";
import { concurrent } from "@metreeca/flow/tasks";

const throttle = createThrottle({ minimum: 1000 });  // limit to max 1 request per second

await pipe(
	(feed(ids))
	(concurrent(4, retrieve(throttle)))  // inject delays to enforce the rate limit
	(forEach(x => console.log(x)))
);
```

## Working with Infinite Feeds

Use `iterate()` to open infinite feeds from generator functions. Items are pulled lazily, so an infinite feed is
consumed only as far as the pipe demands: bound it with a task like `take()`, or with a sink deciding its outcome
early, such as `some()`, `every()` or `find()`.

Tasks draining the whole feed before emitting anything, namely `sort()`, `group()` and an unbounded `batch()`, and
sinks needing every item, whether aggregating it (`count()`, `sum()`, `avg()`, `min()`, `max()`) or collecting it into
a container, never complete on an infinite feed: place a bound upstream of them.

```typescript
import { iterate } from '@metreeca/flow/feeds';
import { filter, take } from '@metreeca/flow/tasks';
import { forEach } from '@metreeca/flow/sinks';
import { pipe } from '@metreeca/flow';

await pipe(
	(iterate(() => Math.random()))
	(filter(n => n > 0.5))
	(take(3))
	(forEach(n => console.info(n)))
);
```

## Creating Custom Feeds

Feeds are functions that open a feed over a source of their own.

```typescript
import { pipe } from '@metreeca/flow';
import { feed } from '@metreeca/flow/feeds';
import { toArray } from '@metreeca/flow/sinks';
import type { Feed } from '@metreeca/flow';

function repeat<V>(value: V, count: number): Feed<V> {
	return feed(async function* () {
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
> with [`feed()`](https://metreeca.github.io/flow/functions/feed.html) to ensure `undefined` filtering and conformance
> to the `Feed` contract.

## Creating Custom Tasks

Tasks are functions that transform async iterables. Create custom tasks by returning an async generator function; items
to be dropped are left unyielded or yielded as `undefined`, as feeds never carry it.

```typescript
import { pipe } from '@metreeca/flow';
import { items } from '@metreeca/flow/feeds';
import { toArray } from '@metreeca/flow/sinks';
import type { Task } from '@metreeca/flow';

function double<V extends number>(): Task<V, V> {
	return async function* (source) {
		for await (const item of source) { yield item*2 as V; }
	};
}

await pipe(
	(items(1, 2, 3))
	(double())
	(toArray())
);  // [2, 4, 6]
```

## Creating Custom Sinks

Sinks are functions that consume async iterables and return a promise for the final result.

```typescript
import { pipe } from '@metreeca/flow';
import { items } from '@metreeca/flow/feeds';
import type { Sink } from '@metreeca/flow';

function histogram<V>(): Sink<V, Map<V, number>> {
	return async source => {

		const counts = new Map<V, number>();

		for await (const item of source) { counts.set(item, (counts.get(item) ?? 0)+1); }

		return counts;
	};
}

await pipe(
	(items("a", "b", "a"))
	(histogram())
);  // Map(2) { "a" => 2, "b" => 1 }
```

# Support

- open an [issue](https://github.com/metreeca/flow/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/flow/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/flow?tab=Apache-2.0-1-ov-file) file for details.

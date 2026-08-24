# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unpublished](https://github.com/metreeca/pipe/commits/HEAD)

### Added

- `concurrent` task interleaving several runs of another task over the same stream, under an explicit bound on the
  items in flight

- `group` task collecting stream items into groups sharing the same primitive key

- `toObject` sink collecting stream items into an object keyed by extracted property keys

- `sum` and `avg` sinks aggregating `number` and `bigint` streams, with `bigint` averages rounded to the nearest
  integer, halves away from zero

- `min` and `max` sinks selecting the least and greatest stream item according to an optional comparator, defaulting
  to the `ascending` order from `@metreeca/core/order`

- `data` feed opening a stream from a data source, normalised into the stream according to its shape

### Changed

- `items` feed accepts any number of values, each contributed to the stream as a single item whatever its shape;
  opening a stream from a data source expanded according to its shape is now the responsibility of the `data` feed

- `map` and `flatMap` tasks no longer accept a `parallel` option: concurrency is now controlled by wrapping any task
  with `concurrent`, which replaces both the CPU-core default and the `parallel: 0` unbounded mode with an explicit
  concurrency limit

- `toMap` sink reports duplicate keys as an error rather than silently overwriting previously collected entries

- `toArray`, `toSet`, `toMap`, and `toObject` sinks return deeply immutable results, freezing both the returned
  container and the items, keys, and values collected into it

- `range` feed and `take`, `skip`, `batch`, and `concurrent` tasks reject non-integer bounds with a `TypeError` rather
  than accepting them

- `data`, `iterate`, `chain`, and `merge` feeds, `filter`, `distinct`, `map`, and `flatMap` tasks, and `some`,
  `every`, `find`, `reduce`, and `toMap` sinks accept any thenable wherever a native `Promise` was previously
  required, as declared by the `Awaitable` type from `@metreeca/core/async`

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unpublished](https://github.com/metreeca/flow/commits/HEAD)

## [0.1.0](https://github.com/metreeca/flow/releases/tag/v0.1.0) - 2026-08-28

### Added

- `concurrent` task interleaving several runs of another task over the same feed, under an explicit bound on the
  items in flight

- `group` task collecting feed items into groups sharing the same primitive key

- `toObject` sink collecting feed items into an object keyed by extracted property keys

- `sum` and `avg` sinks aggregating `number` and `bigint` feeds, with `bigint` averages rounded to the nearest
  integer, halves away from zero

- `min` and `max` sinks selecting the least and greatest feed item according to an optional comparator, defaulting
  to the `ascending` order from `@metreeca/core/order`

- `feed` opening a new feed over a data source, normalised according to its shape

### Changed

- Package renamed from `@metreeca/pipe` to `@metreeca/flow`, restarting version numbering at `0.1.0`: imports and the
  dependency entry must be updated, while the `/feeds`, `/tasks` and `/sinks` subpath exports are unchanged

- `Pipe` contract renamed to `Feed`: a feed carries the items open for composition, while a pipe is the composition
  of a feed, its tasks and an optional sink, as assembled by `pipe()`

- `items` feed accepts any number of values, each contributed to the feed as a single item whatever its shape;
  opening a feed over a data source expanded according to its shape is now the responsibility of `feed`

- `chain` and `merge` feeds accept only feeds, rather than data sources of any shape: sources of a different shape are
  opened with `feed` before being combined

- `map` and `flatMap` tasks no longer accept a `parallel` option: concurrency is now controlled by wrapping any task
  with `concurrent`, which replaces both the CPU-core default and the `parallel: 0` unbounded mode with an explicit
  concurrency limit

- `toMap` sink reports duplicate keys as an error rather than silently overwriting previously collected entries

- `toArray`, `toSet`, `toMap`, and `toObject` sinks return deeply immutable results, freezing both the returned
  container and the items, keys, and values collected into it

- `range` feed and `take`, `skip`, `batch`, and `concurrent` tasks reject non-integer bounds with a `TypeError` rather
  than accepting them

- `feed` and `iterate` feeds, `filter`, `distinct`, `map`, and `flatMap` tasks, and `some`, `every`, `find`, `reduce`,
  and `toMap` sinks accept any thenable wherever a native `Promise` was previously required, as declared by the
  `Awaitable` type from `@metreeca/core/async`

### Fixed

- data shapes no longer accept bare values, so a batch of arrays is no longer mistaken for the array carrying it:
  feeds of arrays are expressible and sources shadowing the batch that carries them are rejected at compile time

- feeds never carry `undefined`: optional entries are accepted in every data shape and in task results alike, and
  dropped as they enter the feed, so no task or sink observes one

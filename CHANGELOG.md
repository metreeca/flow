# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unpublished](https://github.com/metreeca/pipe/commits/HEAD)

### Added

- `group` task collecting stream items into groups sharing the same primitive key

### Changed

- `toMap` sink reports duplicate keys as an error rather than silently overwriting previously collected entries

- `items`, `iterate`, `chain`, and `merge` feeds, `filter`, `distinct`, `map`, and `flatMap` tasks, and `some`,
  `every`, `find`, `reduce`, and `toMap` sinks accept any thenable wherever a native `Promise` was previously
  required, as declared by the `Awaitable` type from `@metreeca/core/async`

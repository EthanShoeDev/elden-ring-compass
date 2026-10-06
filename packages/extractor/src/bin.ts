#!/usr/bin/env bun
import { BunRuntime, BunServices } from '@effect/platform-bun';
import { Effect } from 'effect';

import { cli } from './cli.ts';

// Entry point. `BunServices.layer` provides the FileSystem + Path + Stdio +
// Terminal + ChildProcessSpawner services the CLI depends on (the v4 successor
// to v3's `BunContext.layer`). `cli` reads argv from the `Stdio` service.
// oxlint-disable-next-line effecttsgo/strict-effect-provide -- the CLI entry point is where the app layer is provided
cli.pipe(Effect.provide(BunServices.layer), BunRuntime.runMain);

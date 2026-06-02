#!/usr/bin/env bun
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { Effect } from 'effect';

import { cli } from './cli.ts';

// Entry point. `BunContext.layer` provides the FileSystem + CommandExecutor
// services the CLI and the external-tool wrappers (see ./external) depend on.
cli(process.argv).pipe(Effect.provide(BunContext.layer), BunRuntime.runMain);

import { Command } from '@effect/platform';

/**
 * Thin wrapper around the WitchyBND CLI, used in v1 to unpack/serialize the
 * formats we have not yet ported to TS (notably MSB → XML). Demonstrates
 * external-process execution via `@effect/platform`'s `Command` module.
 *
 * Returns an Effect that needs a `CommandExecutor` in context — provided by
 * `BunContext.layer` in `bin.ts`. Replace these calls with native TS parsers
 * (see the plan's Phase 7) to drop the WitchyBND dependency entirely.
 *
 * @param witchyExe absolute path to the WitchyBND executable
 * @param file      the FromSoft file to unpack (e.g. an `.msb.dcx`)
 */
export const witchyUnpack = (witchyExe: string, file: string) =>
  Command.string(Command.make(witchyExe, file));

/** Run WitchyBND and resolve to its raw exit code instead of stdout. */
export const witchyExitCode = (witchyExe: string, file: string) =>
  Command.exitCode(Command.make(witchyExe, file));

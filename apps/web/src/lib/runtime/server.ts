import { Logger, ManagedRuntime } from 'effect';

// Server-side Effect ManagedRuntime (SSR / nitro). Mirror of the client runtime for non-Effect
// boundaries that run on the server (loaders, server functions). Logs in structured logfmt, which
// is friendlier to log aggregators than the pretty client output.
//
// Kept in its own module so the client bundle (and the save-parser worker) never pulls server
// logging in.
const ServerLayer = Logger.layer([Logger.consoleLogFmt]);

export const serverRuntime = ManagedRuntime.make(ServerLayer);

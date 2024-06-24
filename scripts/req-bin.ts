#!/usr/bin/env bun

import Bun from 'bun';
import { mkdir } from 'node:fs/promises';

const server = Bun.serve({
  async fetch(req) {
    const data = await req.json();

    await mkdir('./scripts/req-bin-data', { recursive: true });

    const file = Bun.file(
      `./scripts/req-bin-data/${Date.now().toString()}.json`
    );
    const writer = file.writer();

    writer.write(JSON.stringify(data, null, 2));
    await writer.flush();

    return new Response();
  },
});

console.log(server.port); // 3000
console.log(server.url); // http://localhost:3000

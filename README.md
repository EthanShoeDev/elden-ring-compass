# Elden Ring Compass. Save file / Progression Website

### Check it out here: [www.eldenringcompass.com](https://www.eldenringcompass.com)

## Key Technologies

- TanStack Start (framework)
- TanStack Router (file-based routing)
- TanStack Query (data fetching)
- React 19
- Shadcn
- Tailwind CSS v4
- oxlint/oxfmt (linting/formatting)

## Incredible Packages Used

- [erdb](https://github.com/EldenRingDatabase/erdb)
- [ER-Save-Editor](https://github.com/ClayAmore/ER-Save-Editor/)

## Features

- **Wasm Compilation**: I recompiled the Rust save editor to WebAssembly, enabling it to mostly run in the browser. While save editing isn't implemented yet, it's a potential future update.
- **Local Storage Sync**: The site syncs everything to local storage, including map position, row selection, and column filters.
- **Continuous** Save Polling: A defining feature is the ability to continuously poll your save file, keeping the tab updated without needing to re-upload your save repeatedly.

## Additional Details

The default code snippet requires Node.js for the HTTP server, but any simple HTTP file server will work.

If you prefer, you can manually upload the save without using continuous polling.

## Future Plans

Adding a Quest section.

## Can this get me banned?

No, this site has no ability to make changes to the save. For edits to be possible, you would either need to redownload your save after uploading or the HTTP server would need to support PUT/POST requests, which if you use the snippet provided it doesn't. (Not that my site even makes these requests)
Elden Ring is fine with other programs reading or copying the save. Steam does this repeatedly to make cloud backups.

Let me know what you think!

## Contributing

### Prerequisites

This project uses **Nix** with `flake.nix` to provide a reproducible development environment including:

- Rust toolchain (required for WASM compilation)
- wasm-pack
- Bun runtime
- Node.js
- oxlint/oxfmt

#### Setting up Nix (recommended)

If you have Nix installed with flake support enabled:

```bash
# Enter the development shell (auto-activates with direnv if installed)
nix develop

# Or if using direnv:
direnv allow
```

#### Without Nix

If you prefer not to use Nix, you'll need to install manually:

- [Rust toolchain](https://rustup.rs/) (latest stable)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- [Bun](https://bun.sh/)

### Setup

1. **Enter development environment** (Nix users):

   ```bash
   nix develop
   ```

2. **Install dependencies:**

   ```bash
   bun i
   ```

3. **Build the WASM parser:**
   ```bash
   bun run build:wasm-parser
   ```

### Testing

Run the full test suite:

```bash
# Lint and format check
bun run lint

# TypeScript type checking
bun run typecheck

# Full build verification
bun run build
```

### Development

Start the development server:

```bash
bun run dev
```

### Notes

- The `flake.nix` ensures all developers have identical tool versions
- WASM compilation is required before the app can fully build
- TypeScript errors for missing assets (`src/assets/erdb/`) are expected until WASM is built

# Elden Ring Compass. Save file / Progression Website

### Check it out here: [www.eldenringcompass.com](https://www.eldenringcompass.com)

## Key Technologies

- React 19
- Shadcn
- Tanstack Query

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

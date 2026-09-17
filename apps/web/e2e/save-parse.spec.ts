import { expect, test } from '@playwright/test';

// End-to-end validation of the real worker save-parse path in the actual app: a file upload → the
// Comlink Web Worker → wasm `init()` + `parse_save`. This is the path that was doubly broken
// (missing `Comlink.expose` + missing wasm `init()`) and that Vitest browser mode can't exercise
// (init hangs inside its module worker). If the worker fix works, the UI reports "Success!"; if it
// regresses, this fails with a real browser error instead of a silent hang.
test('parses the test save via the worker (file upload)', async ({ page }) => {
  await page.goto('/');

  // Open the Connect-a-save dialog (retry the click until the content actually mounts — Base UI
  // dialog + hydration can drop the very first click; the dev server never reaches networkidle).
  const trigger = page.getByRole('button', { name: /connect a save/i }).first();
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await expect(async () => {
    await trigger.click();
    await expect(page.getByText(/drop your save here/i)).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });

  // The dialog opens on the File source by default. Upload the committed test save directly — the
  // file input accepts input even while hidden. Path is relative to the runner cwd (apps/web).
  await page
    .locator('input[type="file"]')
    .setInputFiles('../../packages/save-parser/test/fixtures/ER0000.sl2');

  // The worker parse must resolve (not hang on "Loading…"): the dialog closes itself on success and
  // the sidebar switches to the loaded-save state, whose slot switcher names the parsed character.
  await expect(page.getByRole('button', { name: /switch save slot/i })).toBeVisible({
    timeout: 30_000,
  });
});

import { expect, test } from '@playwright/test';

// End-to-end validation of the real worker save-parse path in the actual app: a file upload → the
// Comlink Web Worker → wasm `init()` + `parse_save`. This is the path that was doubly broken
// (missing `Comlink.expose` + missing wasm `init()`) and that Vitest browser mode can't exercise
// (init hangs inside its module worker). If the worker fix works, the UI reports "Success!"; if it
// regresses, this fails with a real browser error instead of a silent hang.
test('parses the test save via the worker (file upload)', async ({ page }) => {
  await page.goto('/');

  // Open the save-source popover (retry the click until the content actually mounts — Base UI
  // popover + hydration can drop the very first click; the dev server never reaches networkidle).
  const trigger = page.getByRole('button', { name: /connect your save file/i });
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await expect(async () => {
    await trigger.click();
    await expect(page.getByText('Select source')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });

  // The popover opens on the File source by default. Upload the committed test save directly — the
  // file input accepts input even while hidden. Path is relative to the runner cwd (apps/web).
  await page.locator('input[type="file"]').setInputFiles('public/ER0000.sl2');

  // The worker parse must resolve and the popover must report success (not hang on "Loading...").
  await expect(page.getByText('Success!')).toBeVisible({ timeout: 30_000 });
});

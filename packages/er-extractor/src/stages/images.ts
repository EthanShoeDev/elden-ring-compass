import { Effect } from 'effect';

/**
 * Stage 7 — images. Extract DLC item-icon atlases + the Land of Shadow map
 * image (TPF → DDS → PNG/JPEG, e.g. via `sharp`) into assets/erdb/.
 *
 * In the old erdb images, I did not want to loose image quality so i committed all images at full resolution.
 * Now that we have the option of just rerunning the extractor our selves, we can compress the images in this step to save space on disk.
 * We should use https://bun.com/docs/runtime/image to compress the images to webp. This should probably be configurable with flags.
 */
export const images = Effect.logInfo(
  'TODO: TPF→DDS→PNG icons + Land of Shadow map image',
);

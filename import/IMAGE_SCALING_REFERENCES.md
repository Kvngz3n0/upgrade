# Android Image Scaling References

This repository includes references for native Android image scaling and decoding improvements.

## Recommended References

- `tachiyomiorg/subsampling-scale-image-view`
  - Repository: https://github.com/tachiyomiorg/subsampling-scale-image-view.git
  - Purpose: efficient large image rendering, pinch-to-zoom, pan, and subsampling support for Android.
  - Use case: replace standard Android `ImageView` rendering in Capacitor Android or native Android modules to prevent oversized image memory and scaling issues.

- `Kvngz3n0/Imge-deecoder`
  - Repository: https://github.com/Kvngz3n0/Imge-deecoder.git
  - Purpose: improved image decoding and handling for Android native components.
  - Use case: add native image decoder support when loading large or unusual image formats from scraped media.
- `imagescaler`
  - Repository: https://github.com/Kvngz3n0/imagescaler.git
  - Purpose: subsampling, tiled image display, pinch-to-zoom and native scaling for large images.
  - Use case: render high resolution scraped media without OutOfMemoryError by loading lower-resolution preview tiles and decoding at visible zoom levels.

## Integration Notes

If you are building the Android app with Capacitor, these references can guide a native plugin or custom Android view:

1. Add the native dependency or copy the library into the `android/` project.
2. Use `SubsamplingScaleImageView` for high-resolution image display where standard scaling fails.
3. Use the image decoder library to pre-process and decode large image files before rendering.
4. Expose native preview functionality via a Capacitor plugin or custom activity.

## Repository updates

- Front-end image previews now use improved scaling behavior in `client/src/components/MediaDownloadPanel.tsx`.
- Documentation in `README.md` and `DEPLOYMENT.md` now references these Android image scaling resources.

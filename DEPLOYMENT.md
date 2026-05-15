# Deployment

## Run locally
```bash
npm run install-all
npm run build
npm run start:server
```

## Docker
```bash
npm run docker:build
npm run docker:run
```

## Notes
- The `import/` folder contains the external client repo and a user-agent generator.
- Android image scaling references are documented in `import/IMAGE_SCALING_REFERENCES.md`.
- The scraper engine uses rotating user agents for better request compatibility.

## GitHub APK build
A GitHub Actions workflow is configured in `.github/workflows/apk-build.yml` to build an Android debug APK artifact on push or manual workflow dispatch.

If the workflow succeeds, download the APK artifact from the workflow run summary.

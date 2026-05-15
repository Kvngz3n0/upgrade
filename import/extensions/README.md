# Media Lookup Extensions

This folder stores site definition files for the media lookup extension loader.

## How it works

Each JSON file defines one lookup target:

- `id`: platform identifier used by the API
- `name`: friendly platform name
- `urlTemplate`: public profile URL template
- `checkUrlTemplate`: URL used for existence checking
- `pattern`: username validation regex
- `headers`: optional request headers for the site
- `disableHead`: optional flag to skip HEAD requests for sites that block them

## Creating a new extension

Copy an existing JSON file, update `id`, `name`, and the URL templates, then add any required headers.

Example:

```json
{
  "id": "example",
  "name": "ExampleSite",
  "urlTemplate": "https://example.com/{username}",
  "checkUrlTemplate": "https://example.com/{username}",
  "pattern": "^[a-zA-Z0-9_-]{1,50}$",
  "headers": {
    "Accept": "text/html"
  }
}
```

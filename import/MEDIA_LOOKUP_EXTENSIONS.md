# Media Lookup Site Extensions

This file describes a reference pattern for adding new sites as extensions to the media lookup engine.

## What it does

The existing media lookup implementation in `server/src/scrapers/socialMediaLookup.ts` uses a static `PLATFORMS` dictionary.
Each platform entry includes:

- `name`: display label
- `url`: the public profile URL template
- `checkUrl`: the URL used to verify existence
- `pattern`: a regex for username validation

When a username is searched, the service:

1. normalizes the username by removing `@`
2. selects platforms to check
3. performs HTTP HEAD requests first, then GET if needed
4. marks a profile as found when the response status is 2xx–3xx

## Extensions approach

A site extensions architecture would let you add new lookup targets without modifying the core `socialMediaLookup.ts` file.

### Recommended structure

- `import/extensions/`
  - `twitter.ts`
  - `github.ts`
  - `instagram.ts`
  - `customSite.ts`

Each extension exports a platform descriptor:

```ts
export const extension = {
  id: 'twitter',
  name: 'Twitter/X',
  url: (username: string) => `https://twitter.com/${username}`,
  checkUrl: (username: string) => `https://twitter.com/${username}`,
  pattern: /^[a-zA-Z0-9_]{1,15}$/,
  headers: {
    'User-Agent': '...',
    'Accept': 'text/html'
  }
};
```

### How to load extensions

The lookup engine could:

1. read the extension definitions from `import/extensions/`
2. merge them into the active platform registry
3. support per-site custom logic such as JSON API checks, redirects, or JavaScript-rendered responses

This makes media lookup more modular and lets you add:

- new social profile sites
- creator platforms
- media-hosting sites
- niche services

## Example use cases

- Add a site-specific extension for `x.com`/`vxtwitter.com`
- Add a platform definition for subscription or adult media lookup targets
- Support sites where profile lookup must use a special endpoint or headers

## Next step for this repo

I can also add a working extension loader and a small `import/extensions/` starter set so your media lookup can be extended with site definitions instead of hard-coded platforms.

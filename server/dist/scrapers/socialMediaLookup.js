import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRandomUserAgent } from './userAgents.js';
const EXTENSIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../import/extensions');
function getFinalResponseUrl(response) {
    return (response?.request?.res?.responseUrl ||
        response?.request?.path ||
        response?.config?.url ||
        null);
}
function extractCanonicalUrl(html) {
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+name=["']twitter:url["'][^>]+content=["']([^"']+)["']/i);
    return canonicalMatch?.[1] || null;
}
function extractUsernameFromUrl(url) {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname.replace(/\/+/g, '/').replace(/\/$/, '');
        const segments = path.split('/').filter(Boolean);
        if (segments.length === 0) {
            return null;
        }
        const candidate = segments[segments.length - 1];
        return candidate.startsWith('@') ? candidate.slice(1) : candidate;
    }
    catch {
        return null;
    }
}
function extractUsernameFromTitle(html) {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!match) {
        return null;
    }
    const title = match[1];
    const usernameMatch = title.match(/@([A-Za-z0-9_.-]{1,50})/);
    return usernameMatch?.[1] || null;
}
function detectMissingProfileHtml(html) {
    if (!html) {
        return false;
    }
    return /(?:page|profile|user|account).{0,30}(?:not found|doesn['’]t exist|cannot find|unavailable|removed|suspended|deleted)/i.test(html);
}
function resolveUsernameFromResponse(html, finalUrl) {
    const canonicalUrl = extractCanonicalUrl(html) || finalUrl;
    const fromCanonical = extractUsernameFromUrl(canonicalUrl || '');
    if (fromCanonical) {
        return fromCanonical;
    }
    const fromTitle = extractUsernameFromTitle(html);
    if (fromTitle) {
        return fromTitle;
    }
    return extractUsernameFromUrl(finalUrl);
}
function getUsernameFromApiResponse(platform, data) {
    if (!data || typeof data !== 'object')
        return null;
    if (platform === 'github' && typeof data.login === 'string')
        return data.login;
    if (platform === 'twitter' && data.data && typeof data.data.username === 'string')
        return data.data.username;
    if (platform === 'instagram' && data.graphql?.user?.username)
        return data.graphql.user.username;
    return null;
}
function loadExtensionPlatforms() {
    const platforms = {};
    try {
        if (!fs.existsSync(EXTENSIONS_DIR)) {
            return platforms;
        }
        for (const fileName of fs.readdirSync(EXTENSIONS_DIR)) {
            if (!fileName.endsWith('.json')) {
                continue;
            }
            const filePath = path.join(EXTENSIONS_DIR, fileName);
            const raw = fs.readFileSync(filePath, 'utf8');
            const def = JSON.parse(raw);
            if (!def.id || !def.name || !def.urlTemplate || !def.checkUrlTemplate || !def.pattern) {
                continue;
            }
            const flags = def.patternFlags || '';
            const pattern = def.pattern.startsWith('/') && def.pattern.endsWith('/')
                ? new RegExp(def.pattern.slice(1, -1), flags)
                : new RegExp(def.pattern, flags);
            platforms[def.id] = {
                name: def.name,
                url: (username) => def.urlTemplate.replace(/{username}/g, encodeURIComponent(username)),
                checkUrl: (username) => def.checkUrlTemplate.replace(/{username}/g, encodeURIComponent(username)),
                pattern,
                headers: def.headers || {},
                disableHead: def.disableHead ?? false
            };
        }
    }
    catch (error) {
        console.warn('Failed to load media lookup extensions:', error);
    }
    return platforms;
}
// Define social media platforms and their URLs
const BUILT_IN_PLATFORMS = {
    twitter: {
        name: 'Twitter/X',
        url: (username) => `https://twitter.com/${username}`,
        checkUrl: (username) => `https://twitter.com/${username}`,
        pattern: /^[a-zA-Z0-9_]{1,15}$/
    },
    github: {
        name: 'GitHub',
        url: (username) => `https://github.com/${username}`,
        checkUrl: (username) => `https://api.github.com/users/${username}`,
        pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/
    },
    instagram: {
        name: 'Instagram',
        url: (username) => `https://instagram.com/${username}`,
        checkUrl: (username) => `https://www.instagram.com/${username}`,
        pattern: /^[a-zA-Z0-9_.]{1,30}$/
    },
    linkedin: {
        name: 'LinkedIn',
        url: (username) => `https://linkedin.com/in/${username}`,
        checkUrl: (username) => `https://www.linkedin.com/in/${username}`,
        pattern: /^[a-zA-Z0-9-]{3,100}$/
    },
    tiktok: {
        name: 'TikTok',
        url: (username) => `https://tiktok.com/@${username}`,
        checkUrl: (username) => `https://www.tiktok.com/@${username}`,
        pattern: /^[a-zA-Z0-9_.]{1,24}$/
    },
    reddit: {
        name: 'Reddit',
        url: (username) => `https://reddit.com/user/${username}`,
        checkUrl: (username) => `https://www.reddit.com/user/${username}`,
        pattern: /^[a-zA-Z0-9_-]{1,20}$/
    },
    youtube: {
        name: 'YouTube',
        url: (username) => `https://youtube.com/@${username}`,
        checkUrl: (username) => `https://www.youtube.com/@${username}`,
        pattern: /^[a-zA-Z0-9_-]{1,30}$/
    },
    twitch: {
        name: 'Twitch',
        url: (username) => `https://twitch.tv/${username}`,
        checkUrl: (username) => `https://www.twitch.tv/${username}`,
        pattern: /^[a-zA-Z0-9_]{4,25}$/
    },
    snapchat: {
        name: 'Snapchat',
        url: (username) => `https://snapchat.com/add/${username}`,
        checkUrl: (username) => `https://www.snapchat.com/add/${username}`,
        pattern: /^[a-zA-Z0-9._-]{1,32}$/
    },
    discord: {
        name: 'Discord',
        url: (username) => `https://discord.com/users/${username}`,
        checkUrl: (username) => `https://discord.com/users/${username}`,
        pattern: /^[a-zA-Z0-9_]{2,32}$/
    },
    mastodon: {
        name: 'Mastodon',
        url: (username) => `https://mastodon.social/@${username}`,
        checkUrl: (username) => `https://mastodon.social/@${username}`,
        pattern: /^[a-zA-Z0-9_]{1,30}$/
    },
    medium: {
        name: 'Medium',
        url: (username) => `https://medium.com/@${username}`,
        checkUrl: (username) => `https://medium.com/@${username}`,
        pattern: /^[a-zA-Z0-9_-]{1,50}$/
    }
};
// Adult / subscription platforms (added on user request)
Object.assign(BUILT_IN_PLATFORMS, {
    onlyfans: {
        name: 'OnlyFans',
        url: (username) => `https://onlyfans.com/${username}`,
        checkUrl: (username) => `https://onlyfans.com/${username}`,
        pattern: /^[a-zA-Z0-9_.-]{1,50}$/
    },
    privix: {
        name: 'Privix',
        url: (username) => `https://privix.com/${username}`,
        checkUrl: (username) => `https://privix.com/${username}`,
        pattern: /^[a-zA-Z0-9_.-]{1,50}$/
    },
    pornhub: {
        name: 'Pornhub',
        url: (username) => `https://www.pornhub.com/model/${username}`,
        checkUrl: (username) => `https://www.pornhub.com/model/${username}`,
        pattern: /^[a-zA-Z0-9_-]{1,50}$/
    },
    subscribeadult: {
        name: 'SubscribeAdult',
        url: (username) => `https://subscribeadult.com/${username}`,
        checkUrl: (username) => `https://subscribeadult.com/${username}`,
        pattern: /^[a-zA-Z0-9_.-]{1,50}$/
    }
});
// Additional adult/subscription platforms and patronage sites
Object.assign(BUILT_IN_PLATFORMS, {
    patreon: {
        name: 'Patreon',
        url: (username) => `https://www.patreon.com/${username}`,
        checkUrl: (username) => `https://www.patreon.com/${username}`,
        pattern: /^[a-zA-Z0-9_-]{1,50}$/
    },
    fansly: {
        name: 'Fansly',
        url: (username) => `https://fansly.com/${username}`,
        checkUrl: (username) => `https://fansly.com/${username}`,
        pattern: /^[a-zA-Z0-9_.-]{1,50}$/
    },
    justforfans: {
        name: 'JustFor.Fans',
        url: (username) => `https://justfor.fans/${username}`,
        checkUrl: (username) => `https://justfor.fans/${username}`,
        pattern: /^[a-zA-Z0-9_.-]{1,50}$/
    },
    manyvids: {
        name: 'ManyVids',
        url: (username) => `https://www.manyvids.com/Profile/${username}`,
        checkUrl: (username) => `https://www.manyvids.com/Profile/${username}`,
        pattern: /^[a-zA-Z0-9_.-]{1,50}$/
    },
    pinterest: {
        name: 'Pinterest',
        url: (username) => `https://www.pinterest.com/${username}/`,
        checkUrl: (username) => `https://www.pinterest.com/${username}/`,
        pattern: /^[a-zA-Z0-9_]{1,30}$/
    },
    vimeo: {
        name: 'Vimeo',
        url: (username) => `https://vimeo.com/${username}`,
        checkUrl: (username) => `https://vimeo.com/${username}`,
        pattern: /^[a-zA-Z0-9_.-]{1,50}$/
    },
    tumblr: {
        name: 'Tumblr',
        url: (username) => `https://${username}.tumblr.com/`,
        checkUrl: (username) => `https://${username}.tumblr.com/`,
        pattern: /^[a-zA-Z0-9_-]{1,50}$/
    },
    soundcloud: {
        name: 'SoundCloud',
        url: (username) => `https://soundcloud.com/${username}`,
        checkUrl: (username) => `https://soundcloud.com/${username}`,
        pattern: /^[a-zA-Z0-9_-]{1,50}$/
    },
    behance: {
        name: 'Behance',
        url: (username) => `https://www.behance.net/${username}`,
        checkUrl: (username) => `https://www.behance.net/${username}`,
        pattern: /^[a-zA-Z0-9_-]{1,50}$/
    },
    dribbble: {
        name: 'Dribbble',
        url: (username) => `https://dribbble.com/${username}`,
        checkUrl: (username) => `https://dribbble.com/${username}`,
        pattern: /^[a-zA-Z0-9_-]{1,50}$/
    },
    facebook: {
        name: 'Facebook',
        url: (username) => `https://www.facebook.com/${username}`,
        checkUrl: (username) => `https://www.facebook.com/${username}`,
        pattern: /^[a-zA-Z0-9._-]{1,50}$/
    },
    spotify: {
        name: 'Spotify',
        url: (username) => `https://open.spotify.com/user/${username}`,
        checkUrl: (username) => `https://open.spotify.com/user/${username}`,
        pattern: /^[a-zA-Z0-9._-]{1,50}$/
    }
});
const EXTENSION_PLATFORMS = loadExtensionPlatforms();
const PLATFORMS = {
    ...BUILT_IN_PLATFORMS,
    ...EXTENSION_PLATFORMS
};
async function checkProfileExists(platform, username) {
    const platformConfig = PLATFORMS[platform];
    if (!platformConfig) {
        return {
            platform,
            username,
            exists: false,
            url: '',
            profileFound: false,
            timestamp: new Date()
        };
    }
    const publicUrl = platformConfig.url(username);
    const targetUrl = platformConfig.checkUrl(username);
    const headers = {
        ...platformConfig.headers,
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
    };
    const createResult = (responseStatus, exists, finalUrl, note, resolvedUsername) => ({
        platform: platformConfig.name,
        username,
        exists,
        url: publicUrl,
        profileFound: exists,
        statusCode: responseStatus,
        timestamp: new Date(),
        redirectedTo: finalUrl && finalUrl !== targetUrl ? finalUrl : undefined,
        resolvedUsername,
        note
    });
    const tryRequest = async (method) => {
        return axios({
            method,
            url: targetUrl,
            timeout: 5000,
            maxRedirects: 10,
            headers,
            validateStatus: () => true
        });
    };
    try {
        let response;
        if (platformConfig.disableHead) {
            response = await tryRequest('get');
        }
        else {
            response = await tryRequest('head');
            if ([405, 403, 429, 406].includes(response.status)) {
                response = await tryRequest('get');
            }
        }
        const finalUrl = getFinalResponseUrl(response) || targetUrl;
        const html = typeof response.data === 'string' ? response.data : '';
        const resolvedFromApi = getUsernameFromApiResponse(platform, response.data);
        const resolvedUsername = resolvedFromApi ||
            resolveUsernameFromResponse(html, finalUrl) ||
            username;
        const exists = response.status >= 200 && response.status < 400 && !detectMissingProfileHtml(html);
        const noteParts = [];
        if (finalUrl !== targetUrl) {
            noteParts.push('Redirect resolved to canonical profile URL');
        }
        if (resolvedUsername && resolvedUsername !== username) {
            noteParts.push('Resolved username change from response');
        }
        const note = noteParts.length > 0 ? noteParts.join('; ') : undefined;
        return createResult(response.status, exists, finalUrl, note, resolvedUsername);
    }
    catch (error) {
        try {
            const response = await tryRequest('get');
            const finalUrl = getFinalResponseUrl(response) || targetUrl;
            const html = typeof response.data === 'string' ? response.data : '';
            const resolvedFromApi = getUsernameFromApiResponse(platform, response.data);
            const resolvedUsername = resolvedFromApi ||
                resolveUsernameFromResponse(html, finalUrl) ||
                username;
            const exists = response.status >= 200 && response.status < 400 && !detectMissingProfileHtml(html);
            const noteParts = [];
            if (finalUrl !== targetUrl) {
                noteParts.push('Redirect resolved to canonical profile URL');
            }
            if (resolvedUsername && resolvedUsername !== username) {
                noteParts.push('Resolved username change from response');
            }
            const note = noteParts.length > 0 ? noteParts.join('; ') : undefined;
            return createResult(response.status, exists, finalUrl, note, resolvedUsername);
        }
        catch {
            return {
                platform: platformConfig.name,
                username,
                exists: false,
                url: publicUrl,
                profileFound: false,
                timestamp: new Date()
            };
        }
    }
}
export async function lookupUsername(username, platformsToSearch) {
    // Validate username
    if (!username || username.length < 1 || username.length > 100) {
        throw new Error('Username must be between 1 and 100 characters');
    }
    // Remove @ if present
    const cleanUsername = username.replace(/^@/, '');
    // Determine which platforms to search
    const platformsToCheck = platformsToSearch || Object.keys(PLATFORMS);
    // Search all platforms concurrently with rate limiting
    const results = await Promise.all(platformsToCheck.map((platform) => checkProfileExists(platform, cleanUsername)));
    const platformsFound = results.filter((r) => r.profileFound).length;
    return {
        searchedUsername: cleanUsername,
        results,
        totalPlatforms: results.length,
        platformsFound,
        timestamp: new Date()
    };
}
export function getAvailablePlatforms() {
    return Object.entries(PLATFORMS).map(([id, config]) => ({
        id,
        name: config.name
    }));
}
//# sourceMappingURL=socialMediaLookup.js.map
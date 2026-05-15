import { JSDOM } from 'jsdom';
import axios from 'axios';
import { spawnSync } from 'child_process';
import path from 'path';
import { getRandomUserAgent } from './userAgents.js';

export interface ScrapedElement {
  tag: string;
  text: string;
  href?: string;
  attributes: Record<string, string>;
}

export interface MediaExtraction {
  images: string[];
  videos: string[];
  audio: string[];
  documents: string[];
  archives: string[];
  ebooks: string[];
}

export interface BasicScrapResult {
  url: string;
  title: string;
  description?: string;
  headings: string[];
  links: { text: string; href: string }[];
  images: string[];
  paragraphs: string[];
  elements: ScrapedElement[];
  media?: MediaExtraction;
  timestamp: Date;
}

export async function scrapeBasic(url: string): Promise<BasicScrapResult> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 12000,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.google.com/'
        },
        validateStatus: () => true,
        maxRedirects: 10
      });

      // For 451 errors, try to fetch anyway if there's content
      if (response.status === 451 && response.data) {
        console.log(`[Attempt ${attempt + 1}] Bypassing 451 - attempting to extract content anyway`);
        return parseContent(url, response.data);
      }

      // For 403, try with additional headers
      if (response.status === 403 && attempt < maxRetries - 1) {
        console.log(`[Attempt ${attempt + 1}] Got 403, retrying with different headers...`);
        continue;
      }

      if (response.status === 403 && response.data) {
        return parseContent(url, response.data);
      }

      if (response.status === 404) {
        throw new Error('❌ Page Not Found: The URL does not exist (404).');
      }

      if (response.status >= 400 && attempt < maxRetries - 1) {
        console.log(`[Attempt ${attempt + 1}] Got status ${response.status}, retrying...`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      if (response.status >= 400) {
        throw new Error(`⚠️ HTTP Error ${response.status}: ${response.statusText}`);
      }

      return parseContent(url, response.data);
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        console.log(`[Attempt ${attempt + 1}] Failed: ${lastError.message}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Failed to scrape after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

export async function scrapeWithPython(url: string): Promise<BasicScrapResult> {
  try {
    // Resolve python script relative to process working dir (server project)
    const script = path.resolve(process.cwd(), 'src', 'scrapers', 'python_scraper.py');
    const args = ['mode=scrape', `url=${url}`];
    // Do not inject dev-only env vars here. Honor the environment provided by the runtime.
    const res = spawnSync('python3', [script, ...args], { encoding: 'utf-8', timeout: 30000, env: process.env });

    if (res.error) {
      throw res.error;
    }

    if (res.status !== 0 && !res.stdout) {
      throw new Error(`Python scraper failed: ${res.stderr || 'no output'}`);
    }

    const out = JSON.parse(res.stdout || '{}');
    if (out.error) {
      throw new Error(out.error);
    }

    // Map Python result fields to BasicScrapResult
    return {
      url: out['url'] ? out['url'] : url,
      title: out['title'] || 'No title',
      description: out['description'] || '',
      headings: out['headings'] || [],
      links: (out['links'] || []).map((l: any) => ({ text: l.text || '', href: l.href || '' })),
      images: out['images'] || [],
      paragraphs: out['paragraphs'] || [],
      elements: [],
      media: out['media'] ? {
        images: out['media']['images'] || [],
        videos: out['media']['videos'] || [],
        audio: out['media']['audio'] || [],
        documents: out['media']['documents'] || [],
        archives: out['media']['archives'] || [],
        ebooks: out['media']['ebooks'] || []
      } : undefined,
      timestamp: new Date()
    } as BasicScrapResult;
  } catch (err) {
    throw new Error(`Python scraper error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function parseContent(url: string, data: string): BasicScrapResult {
  try {
    const dom = new JSDOM(data, { url });
    const document = dom.window.document;

    const normalizeMediaUrl = (value: string): string | null => {
      try {
        const trimmed = value.trim();
        if (!trimmed) return null;
        return new URL(trimmed, url).toString();
      } catch {
        return null;
      }
    };

    const title = document.querySelector('title')?.textContent || 'No title';
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      '';

    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map((el: any) => el.textContent)
      .filter((text: string) => text && text.trim())
      .slice(0, 20);

    const links = Array.from(document.querySelectorAll('a'))
      .map((el: any) => ({
        text: (el.textContent || '').trim().slice(0, 100),
        href: el.getAttribute('href') || ''
      }))
      .filter((link) => link.href)
      .slice(0, 50);

    const images = Array.from(document.querySelectorAll('img'))
      .flatMap((el: any) => [
        el.getAttribute('src'),
        el.getAttribute('data-src'),
        el.getAttribute('data-srcset'),
        el.getAttribute('srcset')
      ])
      .filter(Boolean)
      .map((src: string) => normalizeMediaUrl(src))
      .filter(Boolean) as string[];

    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map((el: any) => (el.textContent || '').trim())
      .filter((text: string) => text.length > 20)
      .slice(0, 10);

    const extractSources = (selector: string, attribute: string): string[] =>
      Array.from(document.querySelectorAll(selector))
        .map((el: any) => el.getAttribute(attribute) || '')
        .filter(Boolean)
        .map((src: string) => normalizeMediaUrl(src))
        .filter(Boolean) as string[];

    const extractMediaLinks = (pattern: RegExp): string[] =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((el: any) => el.getAttribute('href') || '')
        .filter((href: string) => href && pattern.test(href))
        .map((href: string) => normalizeMediaUrl(href))
        .filter(Boolean) as string[];

    const videoUrls = new Set<string>([
      ...extractSources('video[src]', 'src'),
      ...extractSources('video source[src]', 'src'),
      ...extractSources('source[src]', 'src'),
      ...extractSources('source[data-src]', 'data-src'),
      ...extractSources('source[srcset]', 'srcset')
    ]);

    const audioUrls = new Set<string>([
      ...extractSources('audio[src]', 'src'),
      ...extractSources('audio source[src]', 'src'),
      ...extractSources('source[src]', 'src')
    ]);

    const styleUrls = Array.from(document.querySelectorAll('[style]'))
      .map((el: any) => el.getAttribute('style') || '')
      .flatMap((style: string) => {
        const matches = Array.from(style.matchAll(/url\(['\"]?(.*?)['\"]?\)/gi));
        return matches.map((match) => match[1]);
      })
      .map((src: string) => normalizeMediaUrl(src))
      .filter(Boolean) as string[];

    const documentUrls = new Set<string>(extractMediaLinks(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i));
    const archiveUrls = new Set<string>(extractMediaLinks(/\.(zip|rar|7z|gz|tar|bz2)$/i));
    const ebookUrls = new Set<string>(extractMediaLinks(/\.(epub|mobi|azw|azw3)$/i));

    // Collect various elements
    const elements: ScrapedElement[] = Array.from(
      document.querySelectorAll('p, span, div[class*="card"], article, section')
    )
      .slice(0, 100)
      .map((el: any) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 200),
        href: el.getAttribute('href') || undefined,
        attributes: Object.fromEntries(
          Array.from(el.attributes || []).map((attr: any) => [attr.name, attr.value])
        )
      }));

    return {
      url,
      title,
      description,
      headings: headings as string[],
      links,
      images,
      paragraphs: paragraphs as string[],
      elements,
      media: {
        images: Array.from(new Set([...images, ...styleUrls])).slice(0, 50),
        videos: Array.from(videoUrls),
        audio: Array.from(audioUrls),
        documents: Array.from(documentUrls),
        archives: Array.from(archiveUrls),
        ebooks: Array.from(ebookUrls)
      },
      timestamp: new Date()
    };
  } catch (error) {
    throw new Error(`Failed to parse content: ${error instanceof Error ? error.message : String(error)}`);
  }
}

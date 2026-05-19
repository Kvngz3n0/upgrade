import { JSDOM } from 'jsdom';
import axios from 'axios';
import { URL as URLClass } from 'url';
import robotsParser from 'robots-parser';
import { spawnSync } from 'child_process';
import path from 'path';
import { getRandomUserAgent } from './userAgents.js';

export interface CrawlPage {
  url: string;
  title: string;
  description: string;
  textContent?: string;
  outgoingLinks: string[];
  depth: number;
  statusCode: number;
  timestamp: Date;
}

export interface SearchResult {
  sourceUrl: string;
  pageTitle: string;
  excerpt: string;
  matchCount: number;
  timestamp: Date;
}

export interface SearchResultCompilation {
  searchTerm: string;
  startUrl: string;
  resultsFound: number;
  results: SearchResult[];
  pagesSearched: number;
  totalLinks: number;
  errors: Record<string, string>;
  duration: number;
  timestamp: Date;
}

export interface CrawlResult {
  startUrl: string;
  pagesVisited: number;
  pagesCrawled: CrawlPage[];
  totalLinks: number;
  media?: {
    images: string[];
    videos: string[];
    audio: string[];
    documents: string[];
    archives: string[];
    ebooks: string[];
  };
  errors: Record<string, string>;
  duration: number;
  timestamp: Date;
}

interface CrawlQueue {
  url: string;
  depth: number;
}

class WebCrawler {
  private visited = new Set<string>();
  private queue: CrawlQueue[] = [];
  private results: CrawlPage[] = [];
  private errors: Record<string, string> = {};
  private robotsRules: Record<string, any> = {};
  private startTime: number = 0;
  private mediaSets = {
    images: new Set<string>(),
    videos: new Set<string>(),
    audio: new Set<string>(),
    documents: new Set<string>(),
    archives: new Set<string>(),
    ebooks: new Set<string>()
  };

  private normalizeMediaUrl(value: string, baseUrl: string): string | null {
    try {
      const trimmed = value.trim();
      if (!trimmed) return null;
      return new URLClass(trimmed, baseUrl).toString();
    } catch {
      return null;
    }
  }

  private extractMedia(document: any, baseUrl: string) {
    const collect = (selector: string, attr: string): string[] =>
      Array.from(document.querySelectorAll(selector))
        .map((el: any) => el.getAttribute(attr) || '')
        .filter(Boolean)
        .map((value: string) => this.normalizeMediaUrl(value, baseUrl))
        .filter(Boolean) as string[];

    const styleUrls = Array.from(document.querySelectorAll('[style]'))
      .map((el: any) => el.getAttribute('style') || '')
      .flatMap((style: string) => {
        const matches = Array.from(style.matchAll(/url\(['\"]?(.*?)['\"]?\)/gi));
        return matches.map((match) => match[1]);
      })
      .map((value: string) => this.normalizeMediaUrl(value, baseUrl))
      .filter(Boolean) as string[];

    const extractLinks = (pattern: RegExp): string[] =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((el: any) => el.getAttribute('href') || '')
        .filter((href: string) => href && pattern.test(href))
        .map((href: string) => this.normalizeMediaUrl(href, baseUrl))
        .filter(Boolean) as string[];

    return {
      images: Array.from(new Set([
        ...collect('img', 'src'),
        ...collect('img', 'data-src'),
        ...collect('img', 'srcset'),
        ...collect('img', 'data-srcset'),
        ...styleUrls
      ])),
      videos: Array.from(new Set([
        ...collect('video[src]', 'src'),
        ...collect('video source[src]', 'src'),
        ...collect('source[src]', 'src'),
        ...collect('source[data-src]', 'data-src'),
        ...collect('source[srcset]', 'srcset')
      ])),
      audio: Array.from(new Set([
        ...collect('audio[src]', 'src'),
        ...collect('audio source[src]', 'src')
      ])),
      documents: Array.from(new Set(extractLinks(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i))),
      archives: Array.from(new Set(extractLinks(/\.(zip|rar|7z|gz|tar|bz2)$/i))),
      ebooks: Array.from(new Set(extractLinks(/\.(epub|mobi|azw|azw3)$/i)))
    };
  }

  private addMediaUrls(media: {
    images: string[];
    videos: string[];
    audio: string[];
    documents: string[];
    archives: string[];
    ebooks: string[];
  }): void {
    Object.entries(media).forEach(([key, urls]) => {
      urls.forEach((url) => {
        if (!url) return;
        (this.mediaSets as any)[key].add(url);
      });
    });
  }

  private isValidUrl(url: string, baseUrl: string): boolean {
    try {
      const urlObj = new URLClass(url, baseUrl);
      
      // Allow crawling any valid URL (removed domain restriction for cross-domain crawling)
      return urlObj.protocol.startsWith('http');
    } catch {
      return false;
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URLClass(url);
      urlObj.hash = ''; // Remove hash
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private async checkRobotsTxt(url: string): Promise<boolean> {
    try {
      const urlObj = new URLClass(url);
      const domain = urlObj.origin;

      if (!this.robotsRules[domain]) {
        const robotsUrl = `${domain}/robots.txt`;
        const response = await axios.get(robotsUrl, { timeout: 5000 });
        this.robotsRules[domain] = robotsParser(robotsUrl, response.data);
      }

      return this.robotsRules[domain].isAllowed(url, 'Mozilla');
    } catch {
      // If robots.txt doesn't exist, allow crawling
      return true;
    }
  }

  private async crawlPage(url: string, depth: number): Promise<CrawlPage | null> {
    if (this.visited.has(url)) {
      return null;
    }

    this.visited.add(url);

    try {
      // Check robots.txt
      const allowed = await this.checkRobotsTxt(url);
      if (!allowed) {
        this.errors[url] = 'Blocked by robots.txt';
        return null;
      }

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

      // For 451 and 403, try to extract content anyway if available
      if ((response.status === 451 || response.status === 403) && response.data) {
        console.log(`[Crawler] Got status ${response.status} for ${url}, attempting to extract content...`);
      } else if (response.status === 404) {
        this.errors[url] = 'Not Found (404)';
        return null;
      } else if (response.status >= 400) {
        this.errors[url] = `HTTP Error ${response.status}`;
        return null;
      }

      const dom = new JSDOM(response.data, { url });
      const document = dom.window.document;

      const title = document.querySelector('title')?.textContent || '';
      const description =
        document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

      // Extract all links
      const links: Set<string> = new Set();
      document.querySelectorAll('a[href]').forEach((link: any) => {
        try {
          const href = link.getAttribute('href');
          if (href) {
            const absoluteUrl = new URLClass(href, url).toString();
            if (this.isValidUrl(absoluteUrl, url)) {
              links.add(this.normalizeUrl(absoluteUrl));
            }
          }
        } catch {
          // Skip invalid links
        }
      });

      const textContent = document.body?.textContent
        ? document.body.textContent.replace(/\s+/g, ' ').trim().substring(0, 2000)
        : '';

      const page: CrawlPage = {
        url,
        title,
        description,
        textContent,
        outgoingLinks: Array.from(links),
        depth,
        statusCode: response.status,
        timestamp: new Date()
      };

      const media = this.extractMedia(document, url);
      this.addMediaUrls(media);

      return page;
    } catch (error) {
      this.errors[url] = error instanceof Error ? error.message : String(error);
      return null;
    }
  }

  public async crawl(
    startUrl: string,
    maxDepth: number = 2,
    maxPages: number = 50
  ): Promise<CrawlResult> {
    this.visited.clear();
    this.queue = [];
    this.results = [];
    this.errors = {};
    this.startTime = Date.now();

    const normalizedStart = this.normalizeUrl(startUrl);
    this.queue.push({ url: normalizedStart, depth: 0 });

    while (this.queue.length > 0 && this.results.length < maxPages) {
      const { url, depth } = this.queue.shift()!;

      if (depth > maxDepth) continue;
      if (this.visited.has(url)) continue;

      const page = await this.crawlPage(url, depth);

      if (page) {
        this.results.push(page);

        // Add outgoing links to queue
        if (depth < maxDepth) {
          page.outgoingLinks.forEach((link) => {
            if (!this.visited.has(link) && this.results.length < maxPages) {
              this.queue.push({ url: link, depth: depth + 1 });
            }
          });
        }
      }

      // Rate limiting - 500ms between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const duration = Date.now() - this.startTime;
    const totalLinks = this.results.reduce((sum, page) => sum + page.outgoingLinks.length, 0);

    return {
      startUrl,
      pagesVisited: this.visited.size,
      pagesCrawled: this.results,
      totalLinks,
      media: {
        images: Array.from(this.mediaSets.images),
        videos: Array.from(this.mediaSets.videos),
        audio: Array.from(this.mediaSets.audio),
        documents: Array.from(this.mediaSets.documents),
        archives: Array.from(this.mediaSets.archives),
        ebooks: Array.from(this.mediaSets.ebooks)
      },
      errors: this.errors,
      duration,
      timestamp: new Date()
    };
  }

  private escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getExcerpt(content: string, term: string, maxLength: number = 150): string {
    const lower = content.toLowerCase();
    const needle = term.toLowerCase();
    const idx = lower.indexOf(needle);

    if (idx < 0) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    const start = Math.max(0, idx - 40);
    const excerpt = content.substring(start, Math.min(content.length, idx + needle.length + 40));
    return excerpt.trim().substring(0, maxLength) + (excerpt.length > maxLength ? '...' : '');
  }

  public async search(
    startUrl: string,
    searchTerm: string,
    maxDepth: number = 2,
    maxPages: number = 50
  ): Promise<SearchResultCompilation> {
    this.visited.clear();
    this.queue = [];
    this.results = [];
    this.errors = {};
    this.startTime = Date.now();

    const searchResults: SearchResult[] = [];
    const normalizedStart = this.normalizeUrl(startUrl);
    this.queue.push({ url: normalizedStart, depth: 0 });

    const searchRegex = new RegExp(this.escapeRegExp(searchTerm), 'gi');

    while (this.queue.length > 0 && this.results.length < maxPages) {
      const { url, depth } = this.queue.shift()!;

      if (depth > maxDepth) continue;
      if (this.visited.has(url)) continue;

      const page = await this.crawlPage(url, depth);

      if (page) {
        this.results.push(page);

        const titleMatches = (page.title.match(searchRegex) || []).length;
        const descMatches = (page.description.match(searchRegex) || []).length;
        const textMatches = (page.textContent?.match(searchRegex) || []).length;
        const totalMatches = titleMatches + descMatches + textMatches;

        if (totalMatches > 0) {
          const combinedText = [page.title, page.description, page.textContent]
            .filter(Boolean)
            .join(' ');
          const excerpt = this.getExcerpt(combinedText, searchTerm, 180);

          searchResults.push({
            sourceUrl: url,
            pageTitle: page.title || 'Untitled',
            excerpt,
            matchCount: totalMatches,
            timestamp: new Date()
          });
        }

        // Add outgoing links to queue
        if (depth < maxDepth) {
          page.outgoingLinks.forEach((link) => {
            if (!this.visited.has(link) && this.results.length < maxPages) {
              this.queue.push({ url: link, depth: depth + 1 });
            }
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const duration = Date.now() - this.startTime;
    const totalLinks = this.results.reduce((sum, page) => sum + page.outgoingLinks.length, 0);

    return {
      searchTerm,
      startUrl,
      resultsFound: searchResults.length,
      results: searchResults,
      pagesSearched: this.visited.size,
      totalLinks,
      errors: this.errors,
      duration,
      timestamp: new Date()
    };
  }
}

export async function crawlWebsite(
  url: string,
  maxDepth: number = 2,
  maxPages: number = 50
): Promise<CrawlResult> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }

  const crawler = new WebCrawler();
  return crawler.crawl(url, maxDepth, maxPages);
}

export async function searchWebsite(
  url: string,
  searchTerm: string,
  maxDepth: number = 2,
  maxPages: number = 50
): Promise<SearchResultCompilation> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }

  if (!searchTerm.trim()) {
    throw new Error('Search term is required');
  }

  const crawler = new WebCrawler();
  return crawler.search(url, searchTerm, maxDepth, maxPages);
}

export async function crawlWithPython(url: string, maxDepth: number = 2, maxPages: number = 50, ignoreRobots: boolean = false): Promise<CrawlResult> {
  try {
    // Resolve python script relative to process working dir (server project)
    const script = path.resolve(process.cwd(), 'src', 'scrapers', 'python_scraper.py');
    const args = ['mode=crawl', `url=${url}`, `maxDepth=${maxDepth}`, `maxPages=${maxPages}`, `ignoreRobots=${ignoreRobots ? 'true' : 'false'}`];
    // Do not inject dev-only env vars here. Honor the environment provided by the runtime.
    const res = spawnSync('python3', [script, ...args], { encoding: 'utf-8', timeout: 120000, env: process.env });

    if (res.error) throw res.error;
    if (!res.stdout) throw new Error(res.stderr || 'No output from python crawler');

    const out = JSON.parse(res.stdout);
    if (out.error) throw new Error(out.error);

    // Map Python structure to CrawlResult
    return {
      startUrl: out.start || url,
      pagesVisited: (out.results || []).length,
      pagesCrawled: (out.results || []).map((p: any) => ({
        url: p['url'] || url,
        title: p['title'] || '',
        description: p['description'] || '',
        outgoingLinks: (p['links'] || []).map((l: any) => l['href'] || ''),
        depth: 0,
        statusCode: 200,
        timestamp: new Date()
      })),
      totalLinks: (out.results || []).reduce((sum: number, p: any) => sum + ((p['links'] || []).length), 0),
      media: out['media'] ? {
        images: out['media']['images'] || [],
        videos: out['media']['videos'] || [],
        audio: out['media']['audio'] || [],
        documents: out['media']['documents'] || [],
        archives: out['media']['archives'] || [],
        ebooks: out['media']['ebooks'] || []
      } : undefined,
      errors: {},
      duration: 0,
      timestamp: new Date()
    };
  } catch (err) {
    throw new Error(`Python crawler error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

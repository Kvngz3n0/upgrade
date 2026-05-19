import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { scrapeBasic, scrapeWithPython } from './scrapers/basicScraper.js';
import { scrapeWithJS, closeBrowser } from './scrapers/jsScraper.js';
import { crawlWebsite, searchWebsite, crawlWithPython } from './scrapers/webCrawler.js';
import { lookupUsername, getAvailablePlatforms } from './scrapers/socialMediaLookup.js';
import { performWebSearch } from './scrapers/webSearch.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Helper: try multiple engines in order and return the first successful result
interface EngineAttempt {
  engine: string;
  error?: string;
  success: boolean;
}

async function tryEngines<T>(engines: string[], handlers: Record<string, () => Promise<T>>): Promise<{engine: string; result: T; attempts: EngineAttempt[]}> {
  let lastErr: any = null;
  const attempts: EngineAttempt[] = [];
  const availableEngines = Object.keys(handlers);
  
  for (const e of engines) {
    const handler = handlers[e];
    if (!handler) {
      attempts.push({ engine: e, error: `Engine '${e}' not available. Available: ${availableEngines.join(', ')}`, success: false });
      continue;
    }
    try {
      const result = await handler();
      attempts.push({ engine: e, success: true });
      return { engine: e, result, attempts };
    } catch (err) {
      lastErr = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      attempts.push({ engine: e, error: errMsg, success: false });
      console.warn(`Engine ${e} failed:`, errMsg);
    }
  }
  
  // Generate meaningful error message
  const failedEngines = attempts.map(a => `${a.engine}${a.error ? ` (${a.error})` : ''}`).join('; ');
  const allFailed = attempts.every(a => !a.success);
  const errMsg = allFailed && attempts.length > 0 
    ? `All engines failed: ${failedEngines}`
    : `No valid engines provided. Requested: ${engines.join(', ')}. Available: ${availableEngines.join(', ')}`;
  
  throw new Error(errMsg);
}

function normalizeEngineOrder(order: unknown, defaultOrder: string[]): string[] {
  if (!order || typeof order !== 'string') {
    return defaultOrder;
  }

  const normalized = (order as string)
    .split(',')
    .map((engine) => engine.trim())
    .filter((engine) => engine && engine.toLowerCase() !== 'default');

  return normalized.length > 0 ? normalized : defaultOrder;
}

// Basic scraping endpoint
app.post('/api/scrape/basic', async (req: Request, res: Response) => {
  try {
    const { url, engine, fileType, engineOrder } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Determine engine order for fallback
    const candidateEngines = normalizeEngineOrder(engineOrder, (() => {
      const e = (engine || 'html').toString();
      if (e === 'python') return ['python', 'html'];
      if (e === 'js') return ['js', 'html'];
      return ['html', 'python'];
    })());

    const handlers: Record<string, () => Promise<any>> = {
      python: async () => await scrapeWithPython(url),
      html: async () => await scrapeBasic(url),
      js: async () => await scrapeWithJS(url, false)
    };

    const { result: resultObj, engine: usedEngine, attempts } = await tryEngines(candidateEngines, handlers).catch((err) => { throw err; });
    const result = { ...resultObj, _engineUsed: usedEngine, _engineAttempts: attempts };

    // Apply fileType filtering if requested
    if (fileType && fileType !== 'default') {
      const filtered = { ...result } as any;
      if (fileType === 'images') filtered.images = (filtered.images || []).filter((u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u));
      if (fileType === 'documents') filtered.links = (filtered.links || []).filter((l: any) => /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(l.href));
      if (fileType === 'audio') filtered.links = (filtered.links || []).filter((l: any) => /\.(mp3|wav|ogg|m4a)$/i.test(l.href));
      if (fileType === 'texts') {
        filtered.paragraphs = filtered.paragraphs || [];
        filtered.links = (filtered.links || []).filter((l: any) => /\.(txt|md|csv|json)$/i.test(l.href));
      }
      return res.json(filtered);
    }

    res.json(result);
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Scraping failed'
    });
  }
});

// JavaScript-rendered scraping endpoint
app.post('/api/scrape/js', async (req: Request, res: Response) => {
  try {
    const { url, screenshot } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const result = await scrapeWithJS(url, screenshot === true);
    res.json(result);
  } catch (error) {
    console.error('JS Scrape error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'JS scraping failed'
    });
  }
});

// Combined scraping endpoint (tries basic first, then JS)
app.post('/api/scrape', async (req: Request, res: Response) => {
  try {
    const { url, includeJS = false, screenshot = false, engine, fileType, engineOrder } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const results: Record<string, any> = {};

    try {
      // Build candidate engines for basic scrape fallback
      const candidateEngines = normalizeEngineOrder(engineOrder, (() => {
        const e = (engine || 'html').toString();
        if (e === 'python') return includeJS ? ['python', 'html', 'js'] : ['python', 'html'];
        if (e === 'js') return ['js', 'html'];
        return includeJS ? ['html', 'python', 'js'] : ['html', 'python'];
      })());

      const handlers: Record<string, () => Promise<any>> = {
        python: async () => await scrapeWithPython(url),
        html: async () => await scrapeBasic(url),
        js: async () => await scrapeWithJS(url, screenshot)
      };

      // Allow engineOrder override, but preserve the default order when the UI sends "default"
      const engines = normalizeEngineOrder(engineOrder, candidateEngines);
      const { engine: used, result: resObj, attempts } = await tryEngines(engines, handlers);
      results.basic = { ...resObj, _engineUsed: used, _engineAttempts: attempts };
    } catch (error) {
      results.basicError = error instanceof Error ? error.message : 'Failed to scrape basic content';
    }

    if (includeJS && !results.js) {
      try {
        results.js = await scrapeWithJS(url, screenshot);
      } catch (error) {
        results.jsError = error instanceof Error ? error.message : 'Failed to scrape JS content';
      }
    }

    // Apply fileType filtering when returning combined results
    if (fileType && fileType !== 'default') {
      const filtered = { ...results } as any;
      if (filtered.basic) {
        if (fileType === 'images') filtered.basic.images = (filtered.basic.images || []).filter((u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u));
        if (fileType === 'documents') filtered.basic.links = (filtered.basic.links || []).filter((l: any) => /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(l.href));
        if (fileType === 'audio') filtered.basic.links = (filtered.basic.links || []).filter((l: any) => /\.(mp3|wav|ogg|m4a)$/i.test(l.href));
        if (fileType === 'texts') filtered.basic.paragraphs = filtered.basic.paragraphs || [];
      }
      return res.json(filtered);
    }

    res.json(results);
  } catch (error) {
    console.error('Combined scrape error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Scraping failed'
    });
  }
});

// Web Crawling endpoint
app.post('/api/crawl', async (req: Request, res: Response) => {
  try {
    const { url, maxDepth = 2, maxPages = 50, engine, fileType, engineOrder, ignoreRobots = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Limit crawl parameters
    const depth = Math.min(Math.max(parseInt(maxDepth) || 2, 1), 5);
    const pages = Math.min(Math.max(parseInt(maxPages) || 50, 5), 200);

    // Crawl using requested engine with fallback: HTML -> Python by default
    const candidateEngines = normalizeEngineOrder(engineOrder, (() => {
      const e = (engine || 'html').toString();
      if (e === 'python') return ['python', 'html'];
      if (e === 'js') return ['html', 'python'];
      return ['html', 'python'];
    })());

    const handlers: Record<string, () => Promise<any>> = {
      python: async () => await crawlWithPython(url, depth, pages, ignoreRobots),
      html: async () => await crawlWebsite(url, depth, pages)
    };

    const { result, engine: usedEngine, attempts } = await tryEngines(candidateEngines, handlers);
    result._engineUsed = usedEngine;
    result._engineAttempts = attempts;

    // Apply fileType filtering for crawler results if requested
    if (fileType && fileType !== 'default') {
      const filtered = { ...result } as any;
      filtered.pagesCrawled = (filtered.pagesCrawled || []).map((p: any) => {
        const copy = { ...p };
        if (fileType === 'images') copy.outgoingLinks = (copy.outgoingLinks || []).filter((u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u));
        if (fileType === 'audio') copy.outgoingLinks = (copy.outgoingLinks || []).filter((u: string) => /\.(mp3|wav|ogg|m4a)$/i.test(u));
        if (fileType === 'documents') copy.outgoingLinks = (copy.outgoingLinks || []).filter((u: string) => /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(u));
        if (fileType === 'texts') copy.paragraphs = copy.paragraphs || [];
        return copy;
      });
      return res.json(filtered);
    }
    res.json(result);
  } catch (error) {
    console.error('Crawl error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Crawling failed'
    });
  }
});

// Website Search endpoint (Web Search - like Google/DuckDuckGo)
app.post('/api/search', async (req: Request, res: Response) => {
  try {
    const { query, language = 'en', maxResults = 10 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query cannot be empty' });
    }

    // Limit maxResults between 1-50
    const limit = Math.min(Math.max(parseInt(maxResults) || 10, 1), 50);

    const result = await performWebSearch(query.trim(), language, limit);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Search failed'
    });
  }
});

// Social Media Lookup endpoint
app.post('/api/social-lookup', async (req: Request, res: Response) => {
  try {
    const { username, platforms } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (username.length > 100) {
      return res.status(400).json({ error: 'Username is too long (max 100 characters)' });
    }

    const result = await lookupUsername(username, platforms);
    res.json(result);
  } catch (error) {
    console.error('Social lookup error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Social lookup failed'
    });
  }
});

// Get available platforms
app.get('/api/social-platforms', (req: Request, res: Response) => {
  try {
    const platforms = getAvailablePlatforms();
    res.json({ platforms });
  } catch (error) {
    console.error('Get platforms error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get platforms'
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 CORS enabled for: ${CLIENT_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeBrowser();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeBrowser();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

import React, { useState } from 'react';
import axios from 'axios';
import { api } from './api';
import './App.css';
import URLInput from './components/URLInput';
import ScraperSettings from './components/ScraperSettings';
import ResultsDisplay from './components/ResultsDisplay';
import CrawlerPanel from './components/CrawlerPanel';
import CrawlResults from './components/CrawlResults';
import SocialMediaLookup from './components/SocialMediaLookup';
import SocialMediaResults from './components/SocialMediaResults';
import SearchPanel from './components/SearchPanel';
import SearchResults from './components/SearchResults';

interface ScrapResult {
  basic?: any;
  js?: any;
  basicError?: string;
  jsError?: string;
}

type TabType = 'scraper' | 'crawler' | 'social' | 'search';
type ModeType = 'scraper' | 'crawler';

function App() {
  const [mode, setMode] = useState<ModeType>('scraper');
  const [activeTab, setActiveTab] = useState<TabType>('scraper');
  
  // Scraper state
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<ScrapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeJS, setIncludeJS] = useState(false);
  const [screenshot, setScreenshot] = useState(false);
  const [engine, setEngine] = useState<string>('html');
  const [engineOrder, setEngineOrder] = useState<string>('html,python');
  const [fileType, setFileType] = useState<string>('default');
  const [activeResultsTab, setActiveResultsTab] = useState<'basic' | 'js'>('basic');
  
  // Crawler state
  const [crawlResults, setCrawlResults] = useState<any>(null);
  const [crawlLoading, setCrawlLoading] = useState(false);
  
  // Social media state
  const [socialResults, setSocialResults] = useState<any>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await api.post('/scrape', {
        url: url.trim(),
        includeJS,
        screenshot: includeJS ? screenshot : false,
        engine,
        fileType,
        engineOrder
      });
      setResults(response.data);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickScrape = async (quickUrl: string) => {
    setUrl(quickUrl);
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await api.post('/scrape', {
        url: quickUrl,
        includeJS,
        screenshot: false,
        engine,
        fileType,
        engineOrder
      });
      setResults(response.data);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🕷️ Advanced Web Tools</h1>
        <p className="subtitle">Scraping, Crawling & Social Media Research</p>
        
        {/* Mode Toggle */}
        <div className="mode-toggle-container">
          <button
            className={`mode-toggle-btn ${mode === 'scraper' ? 'active' : ''}`}
            onClick={() => {
              setMode('scraper');
              setActiveTab('scraper');
            }}
          >
            🔍 Scraper Mode
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'crawler' ? 'active' : ''}`}
            onClick={() => {
              setMode('crawler');
              setActiveTab('crawler');
            }}
          >
            🕸️ Crawler Mode
          </button>
        </div>
      </header>

      <main className="container">
        {/* Tab Navigation for Social */}
        <div className="tabs-navigation">
          <button
            className={`tab-button ${activeTab === (mode === 'scraper' ? 'scraper' : 'crawler') ? 'active' : ''}`}
            onClick={() => setActiveTab(mode)}
            disabled
          >
            {mode === 'scraper' ? '🔍 Scraper' : '🕸️ Crawler'}
          </button>
          <button
            className={`tab-button ${activeTab === 'social' ? 'active' : ''}`}
            onClick={() => setActiveTab('social')}
          >
            👤 Social Lookup
          </button>
          <button
            className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔎 Search
          </button>
        </div>

        {/* Scraper Tab */}
        {mode === 'scraper' && activeTab === 'scraper' && (
          <>
            <div className="input-section">
              <URLInput
                url={url}
                onUrlChange={setUrl}
                onScrape={handleScrape}
                loading={loading}
              />
              <ScraperSettings
                includeJS={includeJS}
                screenshot={screenshot}
                onIncludeJSChange={setIncludeJS}
                onScreenshotChange={setScreenshot}
                engine={engine}
                onEngineChange={setEngine}
                engineOrder={engineOrder}
                onEngineOrderChange={setEngineOrder}
                fileType={fileType}
                onFileTypeChange={setFileType}
              />
            </div>

            {error && (
              <div className="error-message">
                <strong>❌ Error:</strong> {error}
              </div>
            )}

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Scraping webpage...</p>
              </div>
            )}

            {results && (
              <ResultsDisplay
                results={results}
                activeTab={activeResultsTab}
                onTabChange={setActiveResultsTab}
              />
            )}

            {!loading && !results && !error && (
              <div className="examples">
                <h3>📚 Try these examples:</h3>
                <div className="example-buttons">
                  <button
                    className="example-btn"
                    onClick={() => handleQuickScrape('https://example.com')}
                  >
                    Example.com
                  </button>
                  <button
                    className="example-btn"
                    onClick={() => handleQuickScrape('https://wikipedia.org')}
                  >
                    Wikipedia
                  </button>
                  <button
                    className="example-btn"
                    onClick={() => handleQuickScrape('https://dev.to')}
                  >
                    Dev.to
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Crawler Tab */}
        {mode === 'crawler' && activeTab === 'crawler' && (
          <>
            <CrawlerPanel
              onCrawlStart={() => {
                setCrawlLoading(true);
                setCrawlResults(null);
              }}
              onCrawlComplete={(result) => {
                setCrawlResults(result);
                setCrawlLoading(false);
              }}
              engine={engine}
              fileType={fileType}
              engineOrder={engineOrder}
            />

            {crawlLoading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Crawling website...</p>
              </div>
            )}

            {crawlResults && <CrawlResults result={crawlResults} />}
          </>
        )}

        {/* Social Media Lookup Tab */}
        {activeTab === 'social' && (
          <>
            <SocialMediaLookup
              onLookupStart={() => {
                setSocialLoading(true);
                setSocialResults(null);
              }}
              onLookupComplete={(result) => {
                setSocialResults(result);
                setSocialLoading(false);
              }}
            />

            {socialLoading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Searching platforms...</p>
              </div>
            )}

            {socialResults && <SocialMediaResults result={socialResults} />}
          </>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <>
            <SearchPanel
              onSearchStart={() => {
                setSearchLoading(true);
                setSearchResults(null);
              }}
              onSearchComplete={(result) => {
                setSearchResults(result);
                setSearchLoading(false);
              }}
            />

            {searchLoading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Searching...</p>
              </div>
            )}

            {searchResults && <SearchResults result={searchResults} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;

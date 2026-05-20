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
export declare function crawlWebsite(url: string, maxDepth?: number, maxPages?: number): Promise<CrawlResult>;
export declare function searchWebsite(url: string, searchTerm: string, maxDepth?: number, maxPages?: number): Promise<SearchResultCompilation>;
export declare function crawlWithPython(url: string, maxDepth?: number, maxPages?: number, ignoreRobots?: boolean): Promise<CrawlResult>;
//# sourceMappingURL=webCrawler.d.ts.map
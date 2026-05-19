import './SearchResults.css';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain?: string;
  date?: string;
}

interface SearchResultsProps {
  result: {
    results: SearchResult[];
    query: string;
    totalResults?: number;
    searchTime?: number;
  };
}

function SearchResults({ result }: SearchResultsProps) {
  const { results, query, totalResults, searchTime } = result;

  return (
    <div className="search-results">
      <div className="results-header">
        <h2>🔍 Search Results for "{query}"</h2>
        {totalResults && (
          <p className="results-info">
            Found {totalResults} results
            {searchTime && ` in ${(searchTime / 1000).toFixed(2)}s`}
          </p>
        )}
      </div>

      <div className="results-list">
        {results && results.length > 0 ? (
          results.map((item, index) => (
            <div key={index} className="result-item">
              <div className="result-url">
                {item.domain && <span className="domain">{item.domain}</span>}
              </div>
              <h3 className="result-title">
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              </h3>
              <p className="result-snippet">{item.snippet}</p>
              <p className="result-link">
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.url}
                </a>
              </p>
              {item.date && <p className="result-date">📅 {item.date}</p>}
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>No results found. Try a different query or broaden your terms.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResults;

import React, { useState } from 'react';
import axios from 'axios';
import { api } from '../api';
import './SearchPanel.css';

interface SearchPanelProps {
  onSearchStart: () => void;
  onSearchComplete: (result: any) => void;
}

function SearchPanel({ onSearchStart, onSearchComplete }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('en');
  const [maxResults, setMaxResults] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    onSearchStart();
    setError(null);

    try {
      const response = await api.post('/search', {
        query: query.trim(),
        language,
        maxResults
      });
      onSearchComplete(response.data);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : String(err);
      setError(message);
      onSearchComplete(null);
    }
  };

  return (
    <div className="search-panel">
      <form onSubmit={handleSearch} className="search-form">
        <div className="form-group">
          <label htmlFor="search-query">🔍 Search Query</label>
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter keywords, item names, or phrases to search the web"
            className="input-field"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="select-field"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="max-results">Results Per Page</label>
            <input
              id="max-results"
              type="number"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
              min="1"
              max="50"
              className="input-field"
            />
          </div>
        </div>

        {error && (
          <div className="error-message">
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        <button type="submit" className="search-button">
          🔎 Search the Web
        </button>
      </form>
    </div>
  );
}

export default SearchPanel;

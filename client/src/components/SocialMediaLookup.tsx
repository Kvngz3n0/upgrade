import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../api';
import './SocialMediaLookup.css';

interface Platform {
  id: string;
  name: string;
}

interface SocialMediaLookupProps {
  onLookupStart: () => void;
  onLookupComplete: (result: any) => void;
}

function SocialMediaLookup({ onLookupStart, onLookupComplete }: SocialMediaLookupProps) {
  const [username, setUsername] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available platforms
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const response = await api.get('/social-platforms');
        setPlatforms(response.data.platforms);
        // Select all platforms by default
        setSelectedPlatforms(response.data.platforms.map((p: Platform) => p.id));
      } catch (err) {
        console.error('Failed to load platforms:', err);
      } finally {
        setPlatformsLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  const handleLookup = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    setLoading(true);
    setError(null);
    onLookupStart();

    try {
      const response = await api.post('/social-lookup', {
        username: username.trim(),
        platforms: selectedPlatforms
      });
      onLookupComplete(response.data);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleLookup();
    }
  };

  return (
    <div className="social-lookup-panel">
      <h2>🔍 Social Media Username Lookup</h2>
      <p className="lookup-desc">Search for a username across multiple social media platforms</p>

      <div className="lookup-inputs">
        <input
          type="text"
          className="lookup-username-input"
          placeholder="Enter username (e.g., john_doe, @username)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />

        <button
          className="lookup-button"
          onClick={handleLookup}
          disabled={loading || !username.trim() || selectedPlatforms.length === 0}
        >
          {loading ? '⏳ Searching...' : '🔍 Search'}
        </button>
      </div>

      {error && <div className="lookup-error">{error}</div>}

      <div className="platforms-section">
        <h3>📱 Search Platforms</h3>
        {platformsLoading ? (
          <p>Loading platforms...</p>
        ) : (
          <div className="platforms-grid">
            {platforms.map((platform) => (
              <label key={platform.id} className="platform-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={() => handlePlatformToggle(platform.id)}
                  disabled={loading}
                />
                <span>{platform.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="quick-select">
        <button
          className="quick-select-btn"
          onClick={() => setSelectedPlatforms(platforms.map((p) => p.id))}
          disabled={loading}
        >
          Select All
        </button>
        <button
          className="quick-select-btn"
          onClick={() => setSelectedPlatforms([])}
          disabled={loading}
        >
          Clear All
        </button>
      </div>
    </div>
  );
}

export default SocialMediaLookup;

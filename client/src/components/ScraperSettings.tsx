import React from 'react';
import './ScraperSettings.css';

interface ScraperSettingsProps {
  includeJS: boolean;
  screenshot: boolean;
  engine: string;
  onIncludeJSChange: (value: boolean) => void;
  onScreenshotChange: (value: boolean) => void;
  onEngineChange?: (value: string) => void;
  fileType?: string;
  onFileTypeChange?: (value: string) => void;
  engineOrder?: string;
  onEngineOrderChange?: (value: string) => void;
}

function ScraperSettings({
  includeJS,
  screenshot,
  onIncludeJSChange,
  onScreenshotChange,
  engine,
  onEngineChange,
  fileType,
  onFileTypeChange,
  engineOrder,
  onEngineOrderChange
}: ScraperSettingsProps) {
  return (
    <div className="settings">
      <label className="select-label">
        <span>Engine:</span>
        <select value={engine} onChange={(e) => onEngineChange && onEngineChange(e.target.value)}>
          <option value="html">HTML (fast)</option>
          <option value="js">JS (Puppeteer)</option>
          <option value="python">Python (requests/BeautifulSoup)</option>
        </select>
      </label>

      <label className="select-label">
        <span>Fallback Engine Order:</span>
        <select value={engineOrder || 'html,python'} onChange={(e) => onEngineOrderChange && onEngineOrderChange(e.target.value)}>
          <option value="html,python">HTML first, then Python</option>
          <option value="python,html">Python first, then HTML</option>
          <option value="python,html,js">Python → HTML → JS</option>
          <option value="html,python,js">HTML → Python → JS</option>
        </select>
      </label>

      <label className="select-label">
        <span>File Type:</span>
        <select value={fileType || 'default'} onChange={(e) => onFileTypeChange && onFileTypeChange(e.target.value)}>
          <option value="default">Default (all)</option>
          <option value="images">Images</option>
          <option value="audio">Audio</option>
          <option value="texts">Texts</option>
          <option value="documents">Documents</option>
        </select>
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={includeJS}
          onChange={(e) => onIncludeJSChange(e.target.checked)}
        />
        <span>🔥 Include JavaScript Rendering (slower but more complete)</span>
      </label>

      {includeJS && (
        <label className="checkbox-label nested">
          <input
            type="checkbox"
            checked={screenshot}
            onChange={(e) => onScreenshotChange(e.target.checked)}
          />
          <span>📸 Take Screenshot</span>
        </label>
      )}

      <div className="settings-info">
        <small>
          <strong>Basic:</strong> HTML parsing - fast ⚡
          {includeJS && ' | <strong>JS:</strong> JavaScript rendering - complete 🔥'}
        </small>
      </div>
    </div>
  );
}

export default ScraperSettings;

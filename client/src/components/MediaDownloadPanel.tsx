import React, { useState, useRef, useEffect } from 'react';

interface MediaExtraction {
  images: string[];
  videos: string[];
  audio: string[];
  documents: string[];
  archives: string[];
  ebooks: string[];
}

interface MediaDownloadPanelProps {
  media?: MediaExtraction;
  title?: string;
}

const MediaDownloadPanel: React.FC<MediaDownloadPanelProps> = ({ media, title = 'Media Extraction' }) => {
  const [selected, setSelected] = useState<{ [key: string]: Set<number> }>({
    images: new Set(),
    videos: new Set(),
    audio: new Set(),
    documents: new Set(),
    archives: new Set(),
    ebooks: new Set()
  });

  if (!media || (Object.keys(media).length === 0 || Object.values(media).every(arr => arr.length === 0))) {
    return null;
  }

  const mediaTypes = [
    { key: 'images', label: '🖼️ Images', emoji: '🖼️' },
    { key: 'videos', label: '🎥 Videos', emoji: '🎥' },
    { key: 'audio', label: '🎵 Audio', emoji: '🎵' },
    { key: 'documents', label: '📄 Documents', emoji: '📄' },
    { key: 'archives', label: '📦 Archives', emoji: '📦' },
    { key: 'ebooks', label: '📕 E-books', emoji: '📕' }
  ];

  const toggleItem = (mediaType: string, index: number) => {
    const newSelected = { ...selected };
    if (!newSelected[mediaType]) newSelected[mediaType] = new Set();
    
    const set = newSelected[mediaType];
    if (set.has(index)) {
      set.delete(index);
    } else {
      set.add(index);
    }
    setSelected(newSelected);
  };

  const checkboxRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const toggleAll = (mediaType: string) => {
    const items = (media as any)[mediaType] || [];
    const newSelected = { ...selected };
    if (!newSelected[mediaType]) newSelected[mediaType] = new Set();
    
    const set = newSelected[mediaType];
    if (set.size === items.length) {
      set.clear();
    } else {
      items.forEach((_item: string, idx: number) => set.add(idx));
    }
    setSelected(newSelected);
  };

  useEffect(() => {
    mediaTypes.forEach(({ key }) => {
      const checkbox = checkboxRefs.current[key];
      if (checkbox) {
        const items = (media as any)[key] || [];
        const selectedCount = selected[key]?.size || 0;
        checkbox.indeterminate = selectedCount > 0 && selectedCount < items.length;
      }
    });
  }, [selected]);

  const downloadSelected = () => {
    const toDownload: string[] = [];
    
    Object.entries(selected).forEach(([mediaType, indices]) => {
      const items = (media as any)[mediaType] || [];
      indices.forEach((idx: number) => {
        if (items[idx]) toDownload.push(items[idx]);
      });
    });

    if (toDownload.length === 0) {
      alert('Please select items to download');
      return;
    }

    // Create a download manifest as JSON
    const manifest = {
      timestamp: new Date().toISOString(),
      itemCount: toDownload.length,
      urls: toDownload
    };

    // For now, just open each URL (most modern browsers will download)
    // In a production app, you might create a batch download or use a download manager
    toDownload.forEach((url, idx) => {
      setTimeout(() => {
        window.open(url, '_blank');
      }, idx * 200); // Stagger opens to avoid popup blocking
    });

    console.log('Download manifest:', manifest);
  };

  const downloadAll = () => {
    // Select all items
    const allSelected: { [key: string]: Set<number> } = {};
    mediaTypes.forEach(({ key }) => {
      const items = (media as any)[key] || [];
      allSelected[key] = new Set(items.map((_: string, i: number) => i));
    });
    setSelected(allSelected);
    
    // Trigger download
    setTimeout(() => {
      const toDownload: string[] = [];
      Object.entries(allSelected).forEach(([mediaType, indices]) => {
        const items = (media as any)[mediaType] || [];
        indices.forEach((idx: number) => {
          if (items[idx]) toDownload.push(items[idx]);
        });
      });
      
      toDownload.forEach((url, idx) => {
        setTimeout(() => {
          window.open(url, '_blank');
        }, idx * 200);
      });
    }, 100);
  };

  return (
    <div className="media-panel">
      <div className="media-header">
        <h3>📥 {title}</h3>
        <div className="media-actions">
          <button className="download-btn download-all" onClick={downloadAll}>
            ⬇️ Download All
          </button>
          <button className="download-btn download-selected" onClick={downloadSelected}>
            ⬇️ Download Selected
          </button>
        </div>
      </div>

      <div className="media-sections">
        {mediaTypes.map(({ key, label }) => {
          const items = (media as any)[key] || [];
          if (items.length === 0) return null;

          const selectedCount = selected[key]?.size || 0;

          return (
            <div key={key} className="media-section">
              <div className="section-header">
                <input
                  ref={(el) => {
                    if (el) checkboxRefs.current[key] = el;
                  }}
                  type="checkbox"
                  checked={selectedCount === items.length && items.length > 0}
                  onChange={() => toggleAll(key)}
                  className="select-checkbox"
                />
                <h4>{label}</h4>
                <span className="count-badge">{selectedCount}/{items.length}</span>
              </div>

              <div className="media-items">
                {items.map((url: string, idx: number) => (
                  <div key={idx} className="media-item">
                    <input
                      type="checkbox"
                      checked={selected[key]?.has(idx) || false}
                      onChange={() => toggleItem(key, idx)}
                      className="item-checkbox"
                    />
                    <div className="item-preview">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="item-link"
                        title={url}
                      >
                        {key === 'images' && <img src={url} alt={`Image ${idx}`} className="preview-img" />}
                        {key !== 'images' && <span className="item-url">{new URL(url).pathname.split('/').pop() || url.slice(0, 50)}</span>}
                      </a>
                    </div>
                    <a href={url} download className="download-icon" title="Download">
                      ⬇️
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .media-panel {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .media-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .media-header h3 {
          margin: 0;
          font-size: 18px;
          color: #212529;
        }

        .media-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .download-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .download-all {
          background: #28a745;
          color: white;
        }

        .download-all:hover {
          background: #218838;
        }

        .download-selected {
          background: #007bff;
          color: white;
        }

        .download-selected:hover {
          background: #0056b3;
        }

        .media-sections {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .media-section {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          background: white;
          padding: 15px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #dee2e6;
        }

        .section-header h4 {
          margin: 0;
          font-size: 16px;
          color: #212529;
        }

        .count-badge {
          margin-left: auto;
          background: #e2e3e5;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          color: #495057;
        }

        .select-checkbox {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .media-items {
          display: grid;
          gap: 10px;
          max-height: 400px;
          overflow-y: auto;
        }

        .media-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .media-item:hover {
          background: #e9ecef;
        }

        .item-checkbox {
          cursor: pointer;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .item-preview {
          flex: 1;
          min-width: 0;
          max-width: 280px;
        }

        .item-link {
          color: #007bff;
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: block;
        }

        .item-link:hover {
          text-decoration: underline;
        }

        .preview-img {
          width: 100%;
          max-width: 280px;
          max-height: 180px;
          height: auto;
          object-fit: contain;
          border-radius: 4px;
          display: block;
        }

        .item-url {
          color: #666;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: block;
        }

        .download-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #ffc107;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .download-icon:hover {
          background: #ffb300;
          transform: scale(1.05);
        }

        @media (max-width: 768px) {
          .media-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .media-actions {
            width: 100%;
          }

          .media-item {
            flex-wrap: wrap;
          }

          .item-preview {
            flex-basis: 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default MediaDownloadPanel;

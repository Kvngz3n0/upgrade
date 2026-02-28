// Tab management
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Deactivate all buttons
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        e.target.classList.add('active');
    });
});

// Status update helper
function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.style.color = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#333';
}

// Scrape basic
async function scrapeBasic() {
    const url = document.getElementById('basicUrl').value;
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    await performScrape('basic', { url }, 'basicResults');
}

// Scrape media
async function scrapeMedia() {
    const url = document.getElementById('mediaUrl').value;
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    const mediaTypes = Array.from(
        document.querySelectorAll('#media input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    await performScrape('media', { url, media_types: mediaTypes }, 'mediaResults');
}

// Crawl website
async function crawlWebsite() {
    const url = document.getElementById('crawlUrl').value;
    const maxDepth = parseInt(document.getElementById('maxDepth').value);
    const maxPages = parseInt(document.getElementById('maxPages').value);
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    await performScrape('crawl', { url, max_depth: maxDepth, max_pages: maxPages }, 'crawlResults');
}

// Social media lookup
async function socialLookup() {
    const username = document.getElementById('socialUsername').value;
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    await performScrape('social', { username }, 'socialResults');
}

// Generic scrape performer
async function performScrape(endpoint, data, resultElementId) {
    const resultEl = document.getElementById(resultElementId);
    
    try {
        updateStatus(`Scraping from ${endpoint}...`, 'info');
        resultEl.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
        
        const response = await fetch(`/api/scrape/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            resultEl.innerHTML = `<div class="error"><strong>Error:</strong> ${result.error}</div>`;
            updateStatus(`Error: ${result.error}`, 'error');
            return;
        }
        
        // Display results
        let html = `<div class="success">✓ ${result.count || result.profiles_found || 'Results'} found</div>`;
        
        if (result.gallery_html) {
            html += result.gallery_html;
        } else if (result.data) {
            html += renderDataTable(result.data);
        }
        
        // Add download buttons
        html += `
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button onclick="downloadResults('json')" class="btn-primary" style="width: auto; padding: 10px 20px;">Download JSON</button>
                <button onclick="downloadResults('csv')" class="btn-primary" style="width: auto; padding: 10px 20px;">Download CSV</button>
            </div>
        `;
        
        resultEl.innerHTML = html;
        updateStatus('Scraping completed successfully', 'success');
        
    } catch (error) {
        resultEl.innerHTML = `<div class="error"><strong>Error:</strong> ${error.message}</div>`;
        updateStatus(`Error: ${error.message}`, 'error');
    }
}

// Render data as table
function renderDataTable(data) {
    if (!Array.isArray(data) || !data.length) {
        return '<p>No data to display</p>';
    }
    
    let html = '<table style="width:100%; border-collapse: collapse; margin-top: 15px;">';
    
    // Headers
    const keys = Object.keys(data[0]);
    html += '<tr style="background: #f5f5f5;">';
    keys.forEach(key => {
        html += `<th style="border: 1px solid #ddd; padding: 10px; text-align: left;">${key}</th>`;
    });
    html += '</tr>';
    
    // Rows
    data.forEach(item => {
        html += '<tr>';
        keys.forEach(key => {
            let value = item[key];
            if (typeof value === 'object') value = JSON.stringify(value);
            if (value && value.length > 100) value = value.substring(0, 100) + '...';
            html += `<td style="border: 1px solid #ddd; padding: 10px;">${value || '-'}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</table>';
    return html;
}

// Download results
async function downloadResults(format) {
    try {
        const response = await fetch('/api/download-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ format })
        });
        
        if (!response.ok) {
            alert('Download failed');
            return;
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `results.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        alert(`Download error: ${error.message}`);
    }
}

// Check health on load
window.addEventListener('load', async () => {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            updateStatus('Connected - Ready to scrape', 'success');
        }
    } catch (error) {
        updateStatus('Connection error', 'error');
    }
});

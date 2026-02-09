const form = document.getElementById('whois-form');
const targetInput = document.getElementById('target');
const clearBtn = document.getElementById('clear-btn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const resultsDiv = document.getElementById('results');
const tabParsed = document.getElementById('tab-parsed');
const tabRaw = document.getElementById('tab-raw');
const contentParsed = document.getElementById('content-parsed');
const contentRaw = document.getElementById('content-raw');
const parsedTable = document.getElementById('parsed-table');
const rawData = document.getElementById('raw-data');
const resultTarget = document.getElementById('result-target');
const resultCached = document.getElementById('result-cached');
const resultTimestamp = document.getElementById('result-timestamp');
const copyParsedBtn = document.getElementById('copy-parsed-btn');
const copyRawBtn = document.getElementById('copy-raw-btn');
const recentList = document.getElementById('recent-list');
const noRecent = document.getElementById('no-recent');
const clearHistoryBtn = document.getElementById('clear-history-btn');

const RECENT_QUERIES_KEY = 'whois-recent-queries';
const MAX_RECENT = 10;

let currentData = null;

function showLoading() {
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    resultsDiv.classList.add('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    hideLoading();
}

function showResults() {
    resultsDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    hideLoading();
}

function switchTab(tab) {
    if (tab === 'parsed') {
        tabParsed.classList.add('border-blue-600', 'text-blue-600');
        tabParsed.classList.remove('border-transparent', 'text-gray-500');
        tabRaw.classList.remove('border-blue-600', 'text-blue-600');
        tabRaw.classList.add('border-transparent', 'text-gray-500');
        contentParsed.classList.remove('hidden');
        contentRaw.classList.add('hidden');
    } else {
        tabRaw.classList.add('border-blue-600', 'text-blue-600');
        tabRaw.classList.remove('border-transparent', 'text-gray-500');
        tabParsed.classList.remove('border-blue-600', 'text-blue-600');
        tabParsed.classList.add('border-transparent', 'text-gray-500');
        contentRaw.classList.remove('hidden');
        contentParsed.classList.add('hidden');
    }
}

function displayParsedData(parsed) {
    parsedTable.innerHTML = '';

    for (const [key, value] of Object.entries(parsed)) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">${escapeHtml(key)}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${escapeHtml(value)}</td>
        `;
        parsedTable.appendChild(row);
    }
}

function displayRawData(raw) {
    rawData.textContent = raw;
}

function displayMetadata(target, cached, timestamp) {
    resultTarget.textContent = target;
    resultCached.textContent = cached ? 'Yes' : 'No';
    resultCached.classList.toggle('text-green-600', cached);
    resultTimestamp.textContent = new Date(timestamp).toLocaleString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function performWhoisLookup(target) {
    showLoading();

    try {
        const response = await fetch(`/api/whois/${encodeURIComponent(target)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            showError(data.error || 'Failed to perform whois lookup');
            return;
        }

        currentData = data;
        displayMetadata(data.target, data.cached, data.timestamp);
        displayParsedData(data.parsed);
        displayRawData(data.raw);
        showResults();

        addToRecentQueries(target);
    } catch (error) {
        showError(`Network error: ${error.message}`);
    }
}

function addToRecentQueries(target) {
    let recent = getRecentQueries();

    recent = recent.filter(q => q !== target);
    recent.unshift(target);
    recent = recent.slice(0, MAX_RECENT);

    localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(recent));
    displayRecentQueries();
}

function getRecentQueries() {
    try {
        const stored = localStorage.getItem(RECENT_QUERIES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function displayRecentQueries() {
    const recent = getRecentQueries();

    if (recent.length === 0) {
        recentList.classList.add('hidden');
        noRecent.classList.remove('hidden');
        return;
    }

    noRecent.classList.add('hidden');
    recentList.classList.remove('hidden');
    recentList.innerHTML = '';

    for (const query of recent) {
        const item = document.createElement('button');
        item.className = 'block w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm text-gray-700 transition-colors';
        item.textContent = query;
        item.onclick = () => {
            targetInput.value = query;
            form.dispatchEvent(new Event('submit'));
        };
        recentList.appendChild(item);
    }
}

function clearRecentQueries() {
    localStorage.removeItem(RECENT_QUERIES_KEY);
    displayRecentQueries();
}

async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('bg-green-100', 'text-green-700');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-100', 'text-green-700');
        }, 2000);
    } catch (error) {
        alert('Failed to copy to clipboard');
    }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const target = targetInput.value.trim();
    if (target) {
        performWhoisLookup(target);
    }
});

clearBtn.addEventListener('click', () => {
    targetInput.value = '';
    resultsDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    targetInput.focus();
});

tabParsed.addEventListener('click', () => switchTab('parsed'));
tabRaw.addEventListener('click', () => switchTab('raw'));

copyParsedBtn.addEventListener('click', () => {
    if (currentData && currentData.parsed) {
        copyToClipboard(JSON.stringify(currentData.parsed, null, 2), copyParsedBtn);
    }
});

copyRawBtn.addEventListener('click', () => {
    if (currentData && currentData.raw) {
        copyToClipboard(currentData.raw, copyRawBtn);
    }
});

clearHistoryBtn.addEventListener('click', clearRecentQueries);

displayRecentQueries();

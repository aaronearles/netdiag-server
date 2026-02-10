// State management
let currentTool = 'whois';
let currentData = null;

// DOM elements - Tool tabs
const toolTabs = {
    whois: document.getElementById('tool-whois'),
    dns: document.getElementById('tool-dns'),
    ping: document.getElementById('tool-ping'),
    port: document.getElementById('tool-port'),
    ssl: document.getElementById('tool-ssl')
};

// DOM elements - Forms
const forms = {
    whois: document.getElementById('form-whois'),
    dns: document.getElementById('form-dns'),
    ping: document.getElementById('form-ping'),
    port: document.getElementById('form-port'),
    ssl: document.getElementById('form-ssl')
};

// DOM elements - UI
const loadingDiv = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const warningsDiv = document.getElementById('warnings');
const warningList = document.getElementById('warning-list');
const resultsDiv = document.getElementById('results');
const tabParsed = document.getElementById('tab-parsed');
const tabRaw = document.getElementById('tab-raw');
const contentParsed = document.getElementById('content-parsed');
const contentRaw = document.getElementById('content-raw');
const parsedData = document.getElementById('parsed-data');
const rawData = document.getElementById('raw-data');
const resultTool = document.getElementById('result-tool');
const resultTarget = document.getElementById('result-target');
const metadataTarget = document.getElementById('metadata-target');
const resultCached = document.getElementById('result-cached');
const resultTimestamp = document.getElementById('result-timestamp');
const copyParsedBtn = document.getElementById('copy-parsed-btn');
const copyRawBtn = document.getElementById('copy-raw-btn');
const recentList = document.getElementById('recent-list');
const noRecent = document.getElementById('no-recent');
const clearHistoryBtn = document.getElementById('clear-history-btn');

const RECENT_QUERIES_KEY = 'nettools-recent-queries';
const MAX_RECENT = 10;

// Tool switching
function switchTool(tool) {
    currentTool = tool;

    // Update tab styling
    Object.keys(toolTabs).forEach(key => {
        const tab = toolTabs[key];
        if (key === tool) {
            tab.classList.add('border-blue-600', 'dark:border-blue-500', 'text-blue-600', 'dark:text-blue-400');
            tab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        } else {
            tab.classList.remove('border-blue-600', 'dark:border-blue-500', 'text-blue-600', 'dark:text-blue-400');
            tab.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        }
    });

    // Show/hide forms
    Object.keys(forms).forEach(key => {
        if (key === tool) {
            forms[key].classList.remove('hidden');
        } else {
            forms[key].classList.add('hidden');
        }
    });

    // Clear results when switching tools
    resultsDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    warningsDiv.classList.add('hidden');
}

// Result tab switching
function switchResultTab(tab) {
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

// UI state functions
function showLoading(message = 'Processing request...') {
    loadingText.textContent = message;
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    warningsDiv.classList.add('hidden');
    resultsDiv.classList.add('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    warningsDiv.classList.add('hidden');
    hideLoading();
}

function showWarnings(warnings) {
    if (!warnings || warnings.length === 0) {
        warningsDiv.classList.add('hidden');
        return;
    }

    warningList.innerHTML = '';
    warnings.forEach(warning => {
        const li = document.createElement('li');
        li.textContent = warning;
        warningList.appendChild(li);
    });
    warningsDiv.classList.remove('hidden');
}

function showResults() {
    resultsDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    hideLoading();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Display functions
function displayMetadata(tool, target, cached, timestamp) {
    resultTool.textContent = tool.toUpperCase();

    if (target) {
        resultTarget.textContent = target;
        metadataTarget.classList.remove('hidden');
    } else {
        metadataTarget.classList.add('hidden');
    }

    resultCached.textContent = cached ? 'Yes' : 'No';
    resultCached.classList.toggle('text-green-600', cached);
    resultTimestamp.textContent = new Date(timestamp).toLocaleString();
}

function displayParsedData(data, tool) {
    parsedData.innerHTML = '';

    // Different rendering based on tool
    switch(tool) {
        case 'whois':
            renderTable(data);
            break;
        case 'dns':
            renderDnsData(data);
            break;
        case 'ping':
            renderPingData(data);
            break;
        case 'port':
            renderPortData(data);
            break;
        case 'ssl':
            renderSslData(data);
            break;
        default:
            renderTable(data);
    }
}

function renderTable(data) {
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200 dark:divide-gray-700';
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700';

    for (const [key, value] of Object.entries(data)) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200 whitespace-nowrap">${escapeHtml(key)}</td>
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">${escapeHtml(value)}</td>
        `;
        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    parsedData.appendChild(table);
}

function renderDnsData(data) {
    const container = document.createElement('div');
    container.className = 'space-y-4';

    if (data.records && data.records.length > 0) {
        const recordsDiv = document.createElement('div');
        recordsDiv.innerHTML = `<h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">DNS Records (${data.record_count})</h4>`;

        const recordList = document.createElement('ul');
        recordList.className = 'bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-1';

        data.records.forEach(record => {
            const li = document.createElement('li');
            li.className = 'text-sm text-gray-700 dark:text-gray-300 font-mono';
            li.textContent = record;
            recordList.appendChild(li);
        });

        recordsDiv.appendChild(recordList);
        container.appendChild(recordsDiv);
    } else {
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No records found</p>';
    }

    parsedData.appendChild(container);
}

function renderPingData(data) {
    const container = document.createElement('div');
    container.className = 'space-y-4';

    // Summary
    const summary = document.createElement('div');
    summary.className = 'bg-gray-50 dark:bg-gray-900 rounded p-4';

    const successRate = 100 - (data.packet_loss_percent || 0);
    const statusColor = successRate === 100 ? 'text-green-600 dark:text-green-400' :
                       successRate >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

    summary.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
                <div class="text-gray-600 dark:text-gray-400">Target</div>
                <div class="font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(data.target)}</div>
            </div>
            <div>
                <div class="text-gray-600 dark:text-gray-400">Packets</div>
                <div class="font-semibold text-gray-800 dark:text-gray-200">${data.packets_sent} sent, ${data.packets_received} received</div>
            </div>
            <div>
                <div class="text-gray-600 dark:text-gray-400">Loss</div>
                <div class="font-semibold ${statusColor}">${data.packet_loss_percent}%</div>
            </div>
            ${data.rtt ? `
            <div>
                <div class="text-gray-600 dark:text-gray-400">Avg RTT</div>
                <div class="font-semibold text-gray-800 dark:text-gray-200">${data.rtt.avg_ms} ms</div>
            </div>
            ` : ''}
        </div>
    `;
    container.appendChild(summary);

    // RTT details if available
    if (data.rtt) {
        const rttDiv = document.createElement('div');
        rttDiv.innerHTML = `
            <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">Round-Trip Time</h4>
            <div class="bg-gray-50 dark:bg-gray-900 rounded p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <div class="text-gray-600 dark:text-gray-400">Min</div>
                    <div class="font-mono text-gray-800 dark:text-gray-200">${data.rtt.min_ms} ms</div>
                </div>
                <div>
                    <div class="text-gray-600 dark:text-gray-400">Avg</div>
                    <div class="font-mono text-gray-800 dark:text-gray-200">${data.rtt.avg_ms} ms</div>
                </div>
                <div>
                    <div class="text-gray-600 dark:text-gray-400">Max</div>
                    <div class="font-mono text-gray-800 dark:text-gray-200">${data.rtt.max_ms} ms</div>
                </div>
                <div>
                    <div class="text-gray-600 dark:text-gray-400">StdDev</div>
                    <div class="font-mono text-gray-800 dark:text-gray-200">${data.rtt.stddev_ms} ms</div>
                </div>
            </div>
        `;
        container.appendChild(rttDiv);
    }

    parsedData.appendChild(container);
}

function renderPortData(data) {
    const container = document.createElement('div');
    container.className = 'bg-gray-50 dark:bg-gray-900 rounded p-6 text-center';

    const statusColor = data.open ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const statusIcon = data.open ? '✓' : '✗';
    const statusText = data.open ? 'OPEN' : 'CLOSED';

    container.innerHTML = `
        <div class="text-4xl mb-2 ${statusColor}">${statusIcon}</div>
        <div class="text-xl font-bold ${statusColor} mb-4">Port ${statusText}</div>
        <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div><span class="font-medium">Host:</span> ${escapeHtml(data.host)}</div>
            <div><span class="font-medium">Port:</span> ${data.port}</div>
            ${data.resolved_ip ? `<div><span class="font-medium">Resolved IP:</span> ${escapeHtml(data.resolved_ip)}</div>` : ''}
            ${data.response_time_ms !== undefined ? `<div><span class="font-medium">Response Time:</span> ${data.response_time_ms} ms</div>` : ''}
        </div>
    `;

    parsedData.appendChild(container);
}

function renderSslData(data) {
    const container = document.createElement('div');
    container.className = 'space-y-4';

    const cert = data.certificate;

    // Validity status
    const validityDiv = document.createElement('div');
    validityDiv.className = 'bg-gray-50 dark:bg-gray-900 rounded p-4';

    const validColor = cert.validity.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const validIcon = cert.validity.valid ? '✓' : '✗';

    validityDiv.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h4 class="font-semibold text-gray-800 dark:text-gray-200">Certificate Status</h4>
            <span class="text-2xl ${validColor}">${validIcon}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
                <div class="text-gray-600 dark:text-gray-400">Valid</div>
                <div class="font-semibold ${validColor}">${cert.validity.valid ? 'Yes' : 'No'}</div>
            </div>
            <div>
                <div class="text-gray-600 dark:text-gray-400">Expired</div>
                <div class="font-semibold ${cert.validity.expired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">${cert.validity.expired ? 'Yes' : 'No'}</div>
            </div>
            <div>
                <div class="text-gray-600 dark:text-gray-400">Days Remaining</div>
                <div class="font-semibold ${cert.validity.days_remaining < 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-800 dark:text-gray-200'}">${cert.validity.days_remaining}</div>
            </div>
        </div>
    `;
    container.appendChild(validityDiv);

    // Subject info
    if (cert.subject && Object.keys(cert.subject).length > 0) {
        const subjectDiv = document.createElement('div');
        subjectDiv.innerHTML = '<h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">Subject</h4>';
        const subjectTable = document.createElement('div');
        subjectTable.className = 'bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-1 text-sm';

        for (const [key, value] of Object.entries(cert.subject)) {
            const row = document.createElement('div');
            row.innerHTML = `<span class="text-gray-600 dark:text-gray-400">${escapeHtml(key)}:</span> <span class="text-gray-800 dark:text-gray-200 font-mono">${escapeHtml(value)}</span>`;
            subjectTable.appendChild(row);
        }

        subjectDiv.appendChild(subjectTable);
        container.appendChild(subjectDiv);
    }

    // Issuer info
    if (cert.issuer && Object.keys(cert.issuer).length > 0) {
        const issuerDiv = document.createElement('div');
        issuerDiv.innerHTML = '<h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">Issuer</h4>';
        const issuerTable = document.createElement('div');
        issuerTable.className = 'bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-1 text-sm';

        for (const [key, value] of Object.entries(cert.issuer)) {
            const row = document.createElement('div');
            row.innerHTML = `<span class="text-gray-600 dark:text-gray-400">${escapeHtml(key)}:</span> <span class="text-gray-800 dark:text-gray-200 font-mono">${escapeHtml(value)}</span>`;
            issuerTable.appendChild(row);
        }

        issuerDiv.appendChild(issuerTable);
        container.appendChild(issuerDiv);
    }

    // Validity dates
    const datesDiv = document.createElement('div');
    datesDiv.innerHTML = `
        <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">Validity Period</h4>
        <div class="bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-1 text-sm">
            <div><span class="text-gray-600 dark:text-gray-400">Not Before:</span> <span class="text-gray-800 dark:text-gray-200 font-mono">${new Date(cert.validity.not_before).toLocaleString()}</span></div>
            <div><span class="text-gray-600 dark:text-gray-400">Not After:</span> <span class="text-gray-800 dark:text-gray-200 font-mono">${new Date(cert.validity.not_after).toLocaleString()}</span></div>
        </div>
    `;
    container.appendChild(datesDiv);

    // Subject Alternative Names
    if (cert.subject_alt_names && cert.subject_alt_names.length > 0) {
        const sanDiv = document.createElement('div');
        sanDiv.innerHTML = `
            <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">Subject Alternative Names</h4>
            <div class="bg-gray-50 dark:bg-gray-900 rounded p-4">
                <div class="flex flex-wrap gap-2">
                    ${cert.subject_alt_names.map(san =>
                        `<span class="bg-white dark:bg-gray-800 px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200">${escapeHtml(san)}</span>`
                    ).join('')}
                </div>
            </div>
        `;
        container.appendChild(sanDiv);
    }

    // Key and signature info
    const techDiv = document.createElement('div');
    techDiv.innerHTML = `
        <h4 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">Technical Details</h4>
        <div class="bg-gray-50 dark:bg-gray-900 rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            ${cert.key ? `
            <div>
                <div class="text-gray-600 dark:text-gray-400">Key Algorithm</div>
                <div class="font-mono text-gray-800 dark:text-gray-200">${escapeHtml(cert.key.algorithm || 'N/A')}</div>
            </div>
            <div>
                <div class="text-gray-600 dark:text-gray-400">Key Size</div>
                <div class="font-mono text-gray-800 dark:text-gray-200">${cert.key.size || 'N/A'} bits</div>
            </div>
            ` : ''}
            ${cert.signature_algorithm ? `
            <div>
                <div class="text-gray-600 dark:text-gray-400">Signature Algorithm</div>
                <div class="font-mono text-gray-800 dark:text-gray-200">${escapeHtml(cert.signature_algorithm)}</div>
            </div>
            ` : ''}
            ${cert.serial_number ? `
            <div>
                <div class="text-gray-600 dark:text-gray-400">Serial Number</div>
                <div class="font-mono text-gray-800 dark:text-gray-200 text-xs break-all">${escapeHtml(cert.serial_number)}</div>
            </div>
            ` : ''}
            ${cert.self_signed !== undefined ? `
            <div>
                <div class="text-gray-600 dark:text-gray-400">Self-Signed</div>
                <div class="font-mono ${cert.self_signed ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-800 dark:text-gray-200'}">${cert.self_signed ? 'Yes' : 'No'}</div>
            </div>
            ` : ''}
        </div>
    `;
    container.appendChild(techDiv);

    parsedData.appendChild(container);
}

function displayRawData(raw) {
    if (!raw) {
        rawData.textContent = 'No raw output available';
        return;
    }
    rawData.textContent = raw;
}

// API call functions
async function performWhoisLookup(target) {
    showLoading('Querying whois server...');

    try {
        const response = await fetch(`/api/whois/${encodeURIComponent(target)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            showError(data.error || 'Failed to perform whois lookup');
            return;
        }

        currentData = data;
        displayMetadata('whois', data.target, data.cached, data.timestamp);
        displayParsedData(data.parsed, 'whois');
        displayRawData(data.raw);
        showWarnings(data.warnings);
        showResults();

        addToRecentQueries('whois', target);
    } catch (error) {
        showError(`Network error: ${error.message}`);
    }
}

async function performDnsLookup(hostname, type) {
    showLoading('Querying DNS server...');

    try {
        const response = await fetch(`/api/dns/${encodeURIComponent(hostname)}?type=${encodeURIComponent(type)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            showError(data.error || 'Failed to perform DNS lookup');
            return;
        }

        currentData = data;
        displayMetadata('dns', `${data.hostname} (${data.type})`, data.cached, data.timestamp);
        displayParsedData(data, 'dns');
        displayRawData(data.raw);
        showWarnings(data.warnings);
        showResults();

        addToRecentQueries('dns', `${hostname} (${type})`);
    } catch (error) {
        showError(`Network error: ${error.message}`);
    }
}

async function performPing(target, count) {
    showLoading('Pinging host...');

    try {
        const response = await fetch(`/api/ping/${encodeURIComponent(target)}?count=${count}`);
        const data = await response.json();

        // Ping can return success:false for 100% packet loss
        if (!response.ok) {
            showError(data.error || 'Failed to ping host');
            return;
        }

        currentData = data;
        displayMetadata('ping', data.target, data.cached, data.timestamp);
        displayParsedData(data, 'ping');
        displayRawData(data.raw);

        const warnings = [];
        if (data.packet_loss_percent > 0) {
            warnings.push(`${data.packet_loss_percent}% packet loss detected`);
        }
        if (!data.success) {
            warnings.push('Host unreachable or all packets lost');
        }
        showWarnings(warnings);

        showResults();

        addToRecentQueries('ping', `${target} (${count})`);
    } catch (error) {
        showError(`Network error: ${error.message}`);
    }
}

async function performPortCheck(host, port) {
    showLoading('Checking port...');

    try {
        const response = await fetch(`/api/port/${encodeURIComponent(host)}/${port}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            showError(data.error || 'Failed to check port');
            return;
        }

        currentData = data;
        displayMetadata('port', null, data.cached, data.timestamp);
        displayParsedData(data, 'port');
        displayRawData(data.raw);

        const warnings = [];
        if (!data.open) {
            warnings.push(`Port ${port} is closed or filtered on ${host}`);
        }
        showWarnings(warnings);

        showResults();

        addToRecentQueries('port', `${host}:${port}`);
    } catch (error) {
        showError(`Network error: ${error.message}`);
    }
}

async function performSslCheck(hostname, port) {
    showLoading('Retrieving SSL certificate...');

    try {
        const response = await fetch(`/api/ssl/${encodeURIComponent(hostname)}?port=${port}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            showError(data.error || 'Failed to retrieve SSL certificate');
            return;
        }

        currentData = data;
        displayMetadata('ssl', `${data.hostname}:${data.port}`, data.cached, data.timestamp);
        displayParsedData(data, 'ssl');
        displayRawData(data.raw);
        showWarnings(data.warnings);
        showResults();

        addToRecentQueries('ssl', `${hostname}:${port}`);
    } catch (error) {
        showError(`Network error: ${error.message}`);
    }
}

// Recent queries management
function addToRecentQueries(tool, query) {
    let recent = getRecentQueries();
    const entry = { tool, query, timestamp: Date.now() };

    // Remove duplicates
    recent = recent.filter(r => !(r.tool === tool && r.query === query));
    recent.unshift(entry);
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

    for (const entry of recent) {
        const item = document.createElement('button');
        item.className = 'block w-full text-left px-4 py-2 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-sm transition-colors';

        const toolBadge = document.createElement('span');
        toolBadge.className = 'inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium mr-2';
        toolBadge.textContent = entry.tool.toUpperCase();

        const queryText = document.createElement('span');
        queryText.className = 'text-gray-700 dark:text-gray-300';
        queryText.textContent = entry.query;

        item.appendChild(toolBadge);
        item.appendChild(queryText);

        item.onclick = () => {
            switchTool(entry.tool);

            // Populate the form based on tool
            switch(entry.tool) {
                case 'whois':
                    document.getElementById('whois-target').value = entry.query;
                    forms.whois.dispatchEvent(new Event('submit'));
                    break;
                case 'dns':
                    const [dnsHost, dnsType] = entry.query.split(' (');
                    document.getElementById('dns-hostname').value = dnsHost;
                    if (dnsType) {
                        document.getElementById('dns-type').value = dnsType.replace(')', '');
                    }
                    forms.dns.dispatchEvent(new Event('submit'));
                    break;
                case 'ping':
                    const [pingHost, pingCount] = entry.query.split(' (');
                    document.getElementById('ping-target').value = pingHost;
                    if (pingCount) {
                        document.getElementById('ping-count').value = pingCount.replace(')', '');
                    }
                    forms.ping.dispatchEvent(new Event('submit'));
                    break;
                case 'port':
                    const [portHost, portNum] = entry.query.split(':');
                    document.getElementById('port-host').value = portHost;
                    document.getElementById('port-number').value = portNum;
                    forms.port.dispatchEvent(new Event('submit'));
                    break;
                case 'ssl':
                    const [sslHost, sslPort] = entry.query.split(':');
                    document.getElementById('ssl-hostname').value = sslHost;
                    document.getElementById('ssl-port').value = sslPort || '443';
                    forms.ssl.dispatchEvent(new Event('submit'));
                    break;
            }
        };

        recentList.appendChild(item);
    }
}

function clearRecentQueries() {
    localStorage.removeItem(RECENT_QUERIES_KEY);
    displayRecentQueries();
}

// Clipboard functions
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

// Event listeners - Tool tabs
Object.keys(toolTabs).forEach(tool => {
    toolTabs[tool].addEventListener('click', () => switchTool(tool));
});

// Event listeners - Forms
forms.whois.addEventListener('submit', (e) => {
    e.preventDefault();
    const target = document.getElementById('whois-target').value.trim();
    if (target) performWhoisLookup(target);
});

forms.dns.addEventListener('submit', (e) => {
    e.preventDefault();
    const hostname = document.getElementById('dns-hostname').value.trim();
    const type = document.getElementById('dns-type').value;
    if (hostname) performDnsLookup(hostname, type);
});

forms.ping.addEventListener('submit', (e) => {
    e.preventDefault();
    const target = document.getElementById('ping-target').value.trim();
    const count = parseInt(document.getElementById('ping-count').value, 10);
    if (target) performPing(target, count);
});

forms.port.addEventListener('submit', (e) => {
    e.preventDefault();
    const host = document.getElementById('port-host').value.trim();
    const port = parseInt(document.getElementById('port-number').value, 10);
    if (host && port) performPortCheck(host, port);
});

forms.ssl.addEventListener('submit', (e) => {
    e.preventDefault();
    const hostname = document.getElementById('ssl-hostname').value.trim();
    const port = parseInt(document.getElementById('ssl-port').value, 10) || 443;
    if (hostname) performSslCheck(hostname, port);
});

// Event listeners - Clear buttons
document.querySelectorAll('.clear-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const form = btn.closest('form');
        form.reset();
        resultsDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        warningsDiv.classList.add('hidden');
    });
});

// Event listeners - Result tabs
tabParsed.addEventListener('click', () => switchResultTab('parsed'));
tabRaw.addEventListener('click', () => switchResultTab('raw'));

// Event listeners - Copy buttons
copyParsedBtn.addEventListener('click', () => {
    if (currentData) {
        const dataToString = currentData.parsed ?
            JSON.stringify(currentData.parsed, null, 2) :
            JSON.stringify(currentData, null, 2);
        copyToClipboard(dataToString, copyParsedBtn);
    }
});

copyRawBtn.addEventListener('click', () => {
    if (currentData && currentData.raw) {
        copyToClipboard(currentData.raw, copyRawBtn);
    }
});

// Event listeners - History
clearHistoryBtn.addEventListener('click', clearRecentQueries);

// Initialize
displayRecentQueries();

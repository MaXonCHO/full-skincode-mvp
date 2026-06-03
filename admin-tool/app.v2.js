const DEFAULT_CONFIG = {
    apiUrl: localStorage.getItem('adminApiUrl') || '/api',
    token: localStorage.getItem('adminApiToken') || 'dev-admin-token'
};

const elements = {
    apiUrlInput: document.getElementById('api-url'),
    tokenInput: document.getElementById('api-token'),
    saveConfigBtn: document.getElementById('save-config'),
    refreshStats: document.getElementById('refresh-stats'),
    refreshGaps: document.getElementById('refresh-gaps'),
    gapsCount: document.getElementById('gaps-count'),
    gapsTotal: document.getElementById('gaps-total'),
    loadMoreGaps: document.getElementById('load-more-gaps'),
    applyFilter: document.getElementById('apply-filter'),
    resetFilter: document.getElementById('reset-filter'),
    filterBrand: document.getElementById('filter-brand'),
    filterLine: document.getElementById('filter-line'),
    linksBody: document.getElementById('links-body'),
    gapsBody: document.getElementById('gaps-body'),
    stats: {
        total: document.getElementById('stat-total'),
        linked: document.getElementById('stat-linked'),
        unlinked: document.getElementById('stat-unlinked'),
        links: document.getElementById('stat-links')
    },
    createForm: document.getElementById('create-link-form'),
    usersBody: document.getElementById('users-body'),
    usersLimit: document.getElementById('users-limit'),
    refreshUsers: document.getElementById('refresh-users'),
    downloadUsers: document.getElementById('download-users'),
    catalogBody: document.getElementById('catalog-body'),
    catalogCount: document.getElementById('catalog-count'),
    catalogTotal: document.getElementById('catalog-total'),
    refreshCatalog: document.getElementById('refresh-catalog'),
    loadMoreCatalog: document.getElementById('load-more-catalog'),
    wipeUsers: document.getElementById('btn-wipe-users'),
    wipeLinks: document.getElementById('btn-wipe-links')
};

let config = { ...DEFAULT_CONFIG };
let currentFilter = { brand: '', line: '' };
let catalogState = { skip: 0, limit: 50, total: 0, products: [] };
let gapsState = { skip: 0, limit: 50, total: 0, products: [] };

function updateConfigUI() {
    elements.apiUrlInput.value = config.apiUrl;
    elements.tokenInput.value = config.token;
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${config.apiUrl}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': config.token,
            ...(options.headers || {})
        },
        ...options
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return null;
}

async function loadStats() {
    toggleLoading(elements.stats.total, true);
    try {
        const stats = await apiRequest('/admin/stats');
        elements.stats.total.textContent = stats.total_products;
        elements.stats.linked.textContent = stats.linked_products;
        elements.stats.unlinked.textContent = stats.unlinked_products;
        elements.stats.links.textContent = stats.total_links;
    } catch (error) {
        showError(elements.stats.total, error);
    } finally {
        toggleLoading(elements.stats.total, false);
    }
}

async function loadGaps(append = false) {
    if (!append) {
        gapsState.skip = 0;
        gapsState.products = [];
        renderGapsPlaceholder('Загрузка...');
    }
    try {
        const data = await apiRequest(`/admin/gaps?skip=${gapsState.skip}&limit=${gapsState.limit}`);
        gapsState.total = data.total;
        gapsState.products = append ? [...gapsState.products, ...data.products] : data.products;
        gapsState.skip += data.products.length;

        elements.gapsCount.textContent = gapsState.products.length;
        elements.gapsTotal.textContent = gapsState.total;

        if (!gapsState.products.length) {
            renderGapsPlaceholder('Все продукты уже в связках');
            elements.loadMoreGaps.disabled = true;
            return;
        }

        elements.gapsBody.innerHTML = gapsState.products
            .map((product) => `
                <tr>
                    <td class="mono">${product.id}</td>
                    <td>${product.brand}</td>
                    <td>${product.line}</td>
                    <td>${product.shade}</td>
                    <td class="mono">${product.hex || '—'}</td>
                </tr>
            `)
            .join('');

        elements.loadMoreGaps.disabled = gapsState.products.length >= gapsState.total;
    } catch (error) {
        renderGapsPlaceholder(error.message || 'Ошибка загрузки');
    }
}

async function loadLinks() {
    renderPlaceholder(elements.linksBody, 'Загрузка...');
    try {
        const query = new URLSearchParams();
        if (currentFilter.brand) query.set('brand', currentFilter.brand);
        if (currentFilter.line) query.set('line', currentFilter.line);
        const data = await apiRequest(`/admin/links?${query.toString()}`);
        if (!data.length) {
            renderPlaceholder(elements.linksBody, 'Нет связок по заданным фильтрам');
            return;
        }
        elements.linksBody.innerHTML = '';
        data.forEach(renderLinkRow);
    } catch (error) {
        renderPlaceholder(elements.linksBody, error.message || 'Ошибка загрузки');
    }
}

async function loadUsers() {
    renderUsersPlaceholder('Загрузка...');
    try {
        const limit = Number(elements.usersLimit.value) || 50;
        const data = await apiRequest(`/admin/user-products?limit=${limit}`);
        if (!data.items.length) {
            renderUsersPlaceholder('Нет пользователей с продуктами');
            return;
        }
        elements.usersBody.innerHTML = data.items
            .map((item) => `
                <tr>
                    <td class="mono">${item.user_id}</td>
                    <td>${item.undertone || '—'}</td>
                    <td>${item.skin_type || '—'}</td>
                    <td>${item.total}</td>
                    <td>
                        <div class="user-products-list">
                            ${item.products.map((p) => `<span title="${p.brand} ${p.line}">${p.shade || p.line}</span>`).join('')}
                        </div>
                    </td>
                </tr>
            `)
            .join('');
    } catch (error) {
        renderUsersPlaceholder(error.message || 'Ошибка загрузки');
    }
}

function renderUsersPlaceholder(text) {
    elements.usersBody.innerHTML = `<tr><td colspan="5" class="muted">${text}</td></tr>`;
}

async function downloadUsersCsv() {
    try {
        const limit = Number(elements.usersLimit.value) || 50;
        const data = await apiRequest(`/admin/user-products?limit=${limit}`);
        if (!data.items.length) {
            alert('Нет данных для экспорта');
            return;
        }
        const rows = [['user_id', 'undertone', 'skin_type', 'product_id', 'brand', 'line', 'shade']];
        data.items.forEach((item) => {
            item.products.forEach((p) => {
                rows.push([
                    item.user_id,
                    item.undertone || '',
                    item.skin_type || '',
                    p.id,
                    p.brand,
                    p.line,
                    p.shade
                ]);
            });
        });
        const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `skincode-user-products.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert(`Не удалось выгрузить CSV: ${error.message}`);
    }
}

function escapeCsvCell(value) {
    const cell = value == null ? '' : String(value);
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return '"' + cell.replace(/"/g, '""') + '"';
    }
    return cell;
}

function renderLinkRow(link) {
    const template = document.getElementById('link-row-template');
    const clone = template.content.cloneNode(true);
    clone.querySelector('[data-field="id"]').textContent = link.id;
    clone.querySelector('[data-field="productA"]').innerHTML = formatProduct(link.product_a);
    clone.querySelector('[data-field="productB"]').innerHTML = formatProduct(link.product_b);
    const weightInput = clone.querySelector('.weight-input');
    weightInput.value = link.co_occurrence_count;
    weightInput.addEventListener('change', () => updateLinkWeight(link.id, weightInput.value));
    clone.querySelector('[data-action="delete"]').addEventListener('click', () => deleteLink(link.id));
    elements.linksBody.appendChild(clone);
}

function formatProduct(product) {
    if (!product) return '<span class="muted">Удалено</span>';
    return `
        <strong>${product.brand}</strong>
        <span>${product.line}</span>
        <span class="mono">${product.shade}</span>
    `;
}

async function updateLinkWeight(id, value) {
    try {
        await apiRequest(`/admin/links/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ co_occurrence_count: Number(value) })
        });
    } catch (error) {
        alert(`Не удалось обновить вес: ${error.message}`);
    }
}

async function deleteLink(id) {
    if (!confirm('Удалить связь?')) return;
    try {
        await apiRequest(`/admin/links/${id}`, { method: 'DELETE' });
        await loadLinks();
        await loadStats();
    } catch (error) {
        alert(`Не удалось удалить: ${error.message}`);
    }
}

function renderPlaceholder(container, text) {
    container.innerHTML = `<tr><td colspan="5" class="muted">${text}</td></tr>`;
}

function renderGapsPlaceholder(text) {
    elements.gapsBody.innerHTML = `<tr><td colspan="5" class="muted">${text}</td></tr>`;
    elements.gapsCount.textContent = '0';
    elements.gapsTotal.textContent = gapsState.total ?? 0;
}

function toggleLoading(node, isLoading) {
    node.classList.toggle('skeleton', isLoading);
}

function showError(node, error) {
    node.textContent = '—';
    alert(error.message || 'Ошибка');
}

function handleSaveConfig() {
    config.apiUrl = elements.apiUrlInput.value.trim() || DEFAULT_CONFIG.apiUrl;
    config.token = elements.tokenInput.value.trim() || DEFAULT_CONFIG.token;
    localStorage.setItem('adminApiUrl', config.apiUrl);
    localStorage.setItem('adminApiToken', config.token);
    loadAll();
}

function handleFilterSubmit() {
    currentFilter.brand = elements.filterBrand.value.trim();
    currentFilter.line = elements.filterLine.value.trim();
    loadLinks();
}

function handleFilterReset() {
    currentFilter = { brand: '', line: '' };
    elements.filterBrand.value = '';
    elements.filterLine.value = '';
    loadLinks();
}

async function handleCreateLink(event) {
    event.preventDefault();
    const a = Number(document.getElementById('product-a').value);
    const b = Number(document.getElementById('product-b').value);
    const weight = Number(document.getElementById('link-weight').value || 1);
    if (!a || !b) {
        alert('Укажите ID обоих продуктов');
        return;
    }
    if (a === b) {
        alert('Нельзя соединять продукт сам с собой');
        return;
    }
    try {
        await apiRequest('/admin/links', {
            method: 'POST',
            body: JSON.stringify({
                product_a_id: a,
                product_b_id: b,
                co_occurrence_count: weight
            })
        });
        event.target.reset();
        document.getElementById('link-weight').value = 1;
        await loadLinks();
        await loadStats();
    } catch (error) {
        alert(`Не удалось создать связь: ${error.message}`);
    }
}

async function loadCatalog(append = false) {
    if (!append) {
        catalogState.skip = 0;
        catalogState.products = [];
        renderCatalogPlaceholder('Загрузка...');
    }
    try {
        const data = await apiRequest(`/admin/all-products?skip=${catalogState.skip}&limit=${catalogState.limit}`);
        catalogState.total = data.total;
        catalogState.products = append ? [...catalogState.products, ...data.products] : data.products;
        catalogState.skip += data.products.length;
        
        elements.catalogCount.textContent = catalogState.products.length;
        elements.catalogTotal.textContent = catalogState.total;
        
        if (!catalogState.products.length) {
            renderCatalogPlaceholder('Нет продуктов в базе');
            return;
        }
        
        elements.catalogBody.innerHTML = catalogState.products
            .map((p) => `
                <tr>
                    <td class="mono">${p.id}</td>
                    <td>${p.brand}</td>
                    <td>${p.line}</td>
                    <td>${p.shade}</td>
                    <td class="mono">${p.hex || '—'}</td>
                </tr>
            `)
            .join('');
        
        elements.loadMoreCatalog.disabled = catalogState.products.length >= catalogState.total;
    } catch (error) {
        renderCatalogPlaceholder(error.message || 'Ошибка загрузки');
    }
}

function renderCatalogPlaceholder(text) {
    elements.catalogBody.innerHTML = `<tr><td colspan="5" class="muted">${text}</td></tr>`;
}

function bindEvents() {
    elements.saveConfigBtn.addEventListener('click', handleSaveConfig);
    elements.refreshStats.addEventListener('click', loadStats);
    elements.refreshGaps.addEventListener('click', () => loadGaps(false));
    elements.applyFilter.addEventListener('click', handleFilterSubmit);
    elements.resetFilter.addEventListener('click', handleFilterReset);
    elements.createForm.addEventListener('submit', handleCreateLink);
    elements.refreshUsers.addEventListener('click', loadUsers);
    elements.downloadUsers.addEventListener('click', downloadUsersCsv);
    elements.refreshCatalog.addEventListener('click', () => loadCatalog(false));
    elements.loadMoreCatalog.addEventListener('click', () => loadCatalog(true));
    elements.loadMoreGaps.addEventListener('click', () => loadGaps(true));
    elements.wipeUsers.addEventListener('click', handleWipeUsers);
    elements.wipeLinks.addEventListener('click', handleWipeLinks);
}

async function handleWipeUsers() {
    if (!confirm('Удалить всех пользователей и их продукты? Действие нельзя отменить.')) {
        return;
    }
    try {
        await apiRequest('/admin/reset/users', { method: 'POST' });
        await Promise.all([loadUsers(), loadStats(), loadLinks(), loadGaps()]);
        alert('Пользовательские данные очищены.');
    } catch (error) {
        alert(`Не удалось очистить пользователей: ${error.message}`);
    }
}

async function handleWipeLinks() {
    if (!confirm('Очистить все связки? Это действие удалит product_co_occurrences.')) {
        return;
    }
    try {
        await apiRequest('/admin/reset/links', { method: 'POST' });
        await Promise.all([loadLinks(), loadStats(), loadGaps()]);
        alert('Все связки удалены.');
    } catch (error) {
        alert(`Не удалось очистить связки: ${error.message}`);
    }
}

async function loadAll() {
    await Promise.all([loadStats(), loadGaps(), loadLinks(), loadUsers(), loadCatalog()]);
}

function init() {
    updateConfigUI();
    bindEvents();
    loadAll();
}

init();

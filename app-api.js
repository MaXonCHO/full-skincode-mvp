// Состояние приложения с интеграцией backend API
const DEFAULT_PRODUCT_IMAGE = 'Скинкод%20фотки%20сайт/product-1.png';

if (typeof api === 'undefined') {
    console.error('API объект не найден! Проверьте загрузку api.js');
}

function fixProductImage(url) {
    if (!url) return DEFAULT_PRODUCT_IMAGE;
    if (url.startsWith('assets/')) {
        return `Скинкод%20фотки%20сайт/${url.replace('assets/', '')}`;
    }
    return url;
}

const WIZARD_STEP_IDS = ['step-1', 'step-1-5', 'step-2', 'step-3', 'step-4'];

const state = {
    userId: null,  // ID пользователя из backend
    anonymousId: localStorage.getItem('skincode_anonymous_id') || null,
    undertone: null,
    skinType: null,
    selectedProduct: null,
    products: [],  // добавленные продукты пользователя
    searchResults: [],
    catalogLoaded: false,
    maxProducts: 3
};

// DOM элементы
const elements = {
    steps: document.querySelectorAll('.step'),
    undertoneBtns: document.querySelectorAll('[data-type="undertone"]'),
    skinBtns: document.querySelectorAll('[data-type="skin"]'),
    btnStart: document.getElementById('btn-start'),
    btnStep1_5: document.getElementById('btn-step-1-5'),
    btnHowItWorks: document.getElementById('btn-how-it-works'),
    btnAlgorithm: document.getElementById('btn-algorithm'),
    btnBack1_5: document.getElementById('btn-back-1-5'),
    btnBack2: document.getElementById('btn-back-2'),
    btnBack4: document.getElementById('btn-back-4'),
    brandSearch: document.getElementById('brand-search'),
    modelSearch: document.getElementById('model-search'),
    shadeSearch: document.getElementById('shade-search'),
    searchResults: document.getElementById('product-search-results'),
    selectedProductText: document.getElementById('selected-product-text'),
    btnAdd: document.getElementById('btn-add'),
    btnFind: document.getElementById('btn-find'),
    productsList: document.getElementById('products-list'),
    productCount: document.getElementById('product-count'),
    resultsGrid: document.getElementById('results-grid'),
    btnDownload: document.getElementById('btn-download'),
    btnRestart: document.getElementById('btn-restart'),
    menuBtn: document.getElementById('menu-btn'),
    menuModal: document.getElementById('menu-modal'),
    menuClose: document.getElementById('menu-close')
};

// Инициализация
async function init() {
    console.log('Инициализация приложения...');
    console.log('DOM готов при выполнении init():', document.readyState);
    console.log('DOM элементы:', {
        btnStart: elements.btnStart,
        undertoneBtns: elements.undertoneBtns.length,
        skinBtns: elements.skinBtns.length
    });
    
    try {
        console.log('Начало initUser()');
        // Создаем или получаем пользователя
        await initUser();
        console.log('initUser() завершен');
        
        console.log('Начало loadFeaturedProducts()');
        // Загружаем данные продуктов
        await loadFeaturedProducts();
        console.log('loadFeaturedProducts() завершен');
        
        console.log('Начало setupEventListeners()');
        // Настраиваем обработчики событий
        setupEventListeners();
        initWizardSteps();
        handleStartQueryParam();
        console.log('setupEventListeners() завершен');
        
        console.log('Инициализация завершена');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

// Инициализация пользователя
async function initUser() {
    try {
        if (typeof api === 'undefined') {
            console.error('API объект не найден в initUser()');
            return;
        }
        
        console.log('Начало создания пользователя, anonymousId:', state.anonymousId);
        console.log('API URL:', api.baseUrl);
        
        const user = await api.createUser(state.anonymousId);
        state.userId = user.id;
        if (user.anonymous_id) {
            state.anonymousId = user.anonymous_id;
            localStorage.setItem('skincode_anonymous_id', user.anonymous_id);
        }
        if (user.undertone) state.undertone = user.undertone;
        if (user.skin_type) state.skinType = user.skin_type;
        console.log('Пользователь:', state.userId, state.anonymousId);
    } catch (error) {
        console.error('Ошибка инициализации пользователя:', error);
        console.error('Детали ошибки:', error.message, error.stack);
    }
}

let searchDebounceTimer = null;

// Загрузка первых продуктов для стартовых подсказок
async function loadFeaturedProducts() {
    try {
        const batch = await api.getProducts(0, 24);
        state.searchResults = batch || [];
        state.catalogLoaded = true;
        renderSearchResults(state.searchResults);
        updateSearchHint();
        console.log('Загружено стартовых продуктов:', state.searchResults.length);
    } catch (error) {
        console.error('Ошибка загрузки продуктов:', error);
        state.searchResults = [];
        renderSearchResults([]);
        updateSearchHint('Каталог пока не загрузился, но поиск всё равно доступен после синхронизации backend.');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Меню
    elements.menuBtn.addEventListener('click', openMenu);
    elements.menuClose.addEventListener('click', closeMenu);
    elements.menuModal.addEventListener('click', (e) => {
        if (e.target === elements.menuModal) closeMenu();
    });
    
    // Этап 1: как это работает
    if (elements.btnHowItWorks) {
        elements.btnHowItWorks.addEventListener('click', () => {
            document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Этап 1: алгоритм
    if (elements.btnAlgorithm) {
        elements.btnAlgorithm.addEventListener('click', () => {
            document.getElementById('algorithm').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Закрытие меню по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    // Этап 1.5: выбор подтона
    elements.undertoneBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            selectUndertone(btn);
        });
    });

    // Этап 1.5: выбор типа кожи
    elements.skinBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            selectSkinType(btn);
        });
    });

    // Поиск каталога
    [elements.brandSearch, elements.modelSearch, elements.shadeSearch].forEach((input) => {
        if (!input) return;
        input.addEventListener('input', () => scheduleCatalogSearch());
    });

    // Этап 4: скачать подборку
    if (elements.btnDownload) elements.btnDownload.addEventListener('click', downloadRecommendations);

    // Этап 4: начать заново
    if (elements.btnRestart) elements.btnRestart.addEventListener('click', resetApp);

    console.log('Обработчики событий настроены');
}

// Выбор подтона
function selectUndertone(btn) {
    elements.undertoneBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.undertone = btn.dataset.value;
    checkStep1_5Complete();
}

// Выбор типа кожи
function selectSkinType(btn) {
    elements.skinBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.skinType = btn.dataset.value;
    checkStep1_5Complete();
}

// Проверка завершенности этапа 1.5
function checkStep1_5Complete() {
    const isComplete = state.undertone && state.skinType;
    elements.btnStep1_5.disabled = !isComplete;
}

// Открыть меню
function openMenu() {
    elements.menuModal.classList.add('active');
    elements.menuBtn.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрыть меню
function closeMenu() {
    elements.menuModal.classList.remove('active');
    elements.menuBtn.classList.remove('active');
    document.body.style.overflow = '';
}

// Обновление прогресс-бара
// 1 = подтон/кожа, 2 = тоналки, 3 = анализ, 4 = результаты
function getProgressStep(currentStep) {
    if (currentStep === 1) return 0;
    if (currentStep === 1.5) return 1;
    if (currentStep === 2) return 2;
    if (currentStep === 3) return 3;
    if (currentStep === 4) return 4;
    return 0;
}

function updateProgressBar(currentStep) {
    const activeSection = document.querySelector('.step.active');
    const progressBars = activeSection
        ? activeSection.querySelectorAll('.progress-bar')
        : document.querySelectorAll('.progress-bar');
    const progressStep = getProgressStep(currentStep);
    
    progressBars.forEach(bar => {
        const steps = bar.querySelectorAll('.progress-step');
        const lines = bar.querySelectorAll('.progress-line');
        
        steps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            
            if (progressStep === 4) {
                if (stepNum === 4) {
                    step.classList.add('active');
                } else {
                    step.classList.add('completed');
                }
            } else if (stepNum === progressStep) {
                step.classList.add('active');
            } else if (stepNum < progressStep) {
                step.classList.add('completed');
            }
        });
        
        lines.forEach((line, index) => {
            line.classList.remove('active');
            if (progressStep === 4) {
                line.classList.add('active');
            } else if (index < progressStep - 1) {
                line.classList.add('active');
            }
        });
    });
}

function initWizardSteps() {
    WIZARD_STEP_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('active', id === 'step-1');
    });
}

// Переход между этапами — всегда один экран виден
function goToStep(stepNum) {
    WIZARD_STEP_IDS.forEach((id) => {
        document.getElementById(id)?.classList.remove('active');
    });

    const stepId = stepNum === 1.5 ? 'step-1-5' : `step-${stepNum}`;
    document.getElementById(stepId)?.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        if (stepNum === 1.5 || stepNum === 2 || stepNum === 3 || stepNum === 4) {
            menuBtn.style.display = 'none';
        } else {
            menuBtn.style.display = 'block';
        }
    }

    updateProgressBar(stepNum);
}

function scheduleCatalogSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(runCatalogSearch, 250);
}

async function runCatalogSearch() {
    const brand = elements.brandSearch?.value?.trim() || '';
    const model = elements.modelSearch?.value?.trim() || '';
    const shade = elements.shadeSearch?.value?.trim() || '';

    state.selectedProduct = null;
    updateSelectedProductView();
    updateAddButton();

    if (!brand && !model && !shade) {
        renderSearchResults(state.searchResults);
        updateSearchHint('Пока можно выбрать из первых продуктов каталога или начать печатать в полях поиска.');
        return;
    }

    try {
        updateSearchHint('Ищем бренд, модель и оттенок в каталоге...');
        const results = await api.searchProducts({
            brand: brand || null,
            model: model || null,
            shade: shade || null,
            limit: 24
        });
        renderSearchResults(results.products || []);
        updateSearchHint(results.total ? `Найдено ${results.total} совпадений.` : 'Ничего не найдено. Попробуй изменить фильтры.');
    } catch (error) {
        console.error('Ошибка поиска каталога:', error);
        updateSearchHint('Не удалось выполнить поиск. Проверь соединение с API.');
        renderSearchResults([]);
    }
}

// Обновление состояния кнопки добавления
function updateAddButton() {
    const canAdd = state.selectedProduct &&
                   state.products.length < state.maxProducts;
    elements.btnAdd.disabled = !canAdd;
}

// Добавление продукта
async function addProduct() {
    if (state.products.length >= state.maxProducts) return;

    const product = state.selectedProduct;
    if (!product) return;

    if (state.products.some(p => p.id === product.id)) {
        alert('Этот продукт уже добавлен.');
        return;
    }

    if (state.userId && typeof api !== 'undefined') {
        try {
            await api.addUserProduct(state.userId, product.id);
        } catch (error) {
            console.error('Ошибка добавления продукта на сервер:', error);
            alert('Не удалось сохранить на сервер. Проверь подключение к API.');
            return;
        }
    }

    state.products.push({
        id: product.id,
        brand: product.brand,
        line: product.line,
        shade: product.shade,
        hex: product.hex,
        image: fixProductImage(product.image_url),
        product_url: product.product_url || ''
    });

    renderProducts();
    updateProductCount();
    updateFindButton();

    state.selectedProduct = null;
    updateSelectedProductView();
    updateAddButton();
}

// Удаление продукта
async function removeProduct(id) {
    try {
        await api.deleteUserProduct(state.userId, id);
        state.products = state.products.filter(p => p.id !== id);
        renderProducts();
        updateAddButton();
        updateProductCount();
        updateFindButton();
    } catch (error) {
        console.error('Ошибка удаления продукта:', error);
    }
}

// Отрисовка списка продуктов
function renderProducts() {
    if (state.products.length === 0) {
        elements.productsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💄</span>
                <p>Продукты появятся здесь</p>
            </div>
        `;
        return;
    }

    elements.productsList.innerHTML = state.products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image}" alt="${product.shade}" loading="lazy">
            </div>
            <div class="product-info">
                <div class="product-brand">${product.brand}</div>
                <div class="product-line">${product.line}</div>
                <div class="product-shade">${product.shade}</div>
            </div>
            <button class="btn-delete" onclick="removeProduct(${product.id})">✕</button>
        </div>
    `).join('');
}

function renderSearchResults(products = []) {
    state.searchResults = products;

    if (!elements.searchResults) return;

    if (!products.length) {
        elements.searchResults.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔎</span>
                <p>Ничего не найдено. Попробуй другой бренд, модель или оттенок.</p>
            </div>
        `;
        return;
    }

    elements.searchResults.innerHTML = products.map((product) => {
        const image = fixProductImage(product.image_url);
        const isSelected = state.selectedProduct && state.selectedProduct.id === product.id;
        return `
            <button type="button" class="search-result-card ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
                <div class="search-result-image">
                    <img src="${image}" alt="${product.shade}" loading="lazy">
                </div>
                <div class="search-result-content">
                    <div class="search-result-brand">${product.brand}</div>
                    <div class="search-result-line">${product.line}</div>
                    <div class="search-result-shade">${product.shade}</div>
                    ${product.price ? `<div class="search-result-price">${Math.round(product.price)} ₽</div>` : ''}
                </div>
            </button>
        `;
    }).join('');

    elements.searchResults.querySelectorAll('[data-product-id]').forEach((button) => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.getAttribute('data-product-id'), 10);
            const selected = products.find((item) => item.id === productId);
            if (selected) {
                state.selectedProduct = selected;
                updateSelectedProductView();
                updateAddButton();
                elements.searchResults.querySelectorAll('.search-result-card').forEach((card) => card.classList.remove('selected'));
                button.classList.add('selected');
            }
        });
    });
}

function updateSelectedProductView() {
    if (!elements.selectedProductText) return;
    if (!state.selectedProduct) {
        elements.selectedProductText.textContent = 'Выбери продукт из результатов поиска';
        return;
    }
    elements.selectedProductText.textContent = `${state.selectedProduct.brand} · ${state.selectedProduct.line} · ${state.selectedProduct.shade}`;
}

function updateSearchHint(text) {
    const hint = document.getElementById('product-search-hint');
    if (hint) {
        hint.textContent = text;
    }
}

// Обновление счетчика продуктов
function updateProductCount() {
    elements.productCount.textContent = `Добавлено: ${state.products.length} из ${state.maxProducts}`;
}

// Обновление кнопки поиска
function updateFindButton() {
    elements.btnFind.disabled = state.products.length === 0;
}

// Поиск совпадений (переход к loading)
async function findMatches() {
    goToStep(3);

    // Анимация шагов загрузки
    const loadingSteps = document.querySelectorAll('.loading-step');
    loadingSteps.forEach(step => step.classList.remove('active', 'completed'));

    const activateStep = (index) => {
        const el = loadingSteps[index] || document.getElementById(`step-analyze-${index + 1}`);
        el?.classList.add('active');
    };
    const completeStep = (index) => {
        const el = loadingSteps[index] || document.getElementById(`step-analyze-${index + 1}`);
        el?.classList.remove('active');
        el?.classList.add('completed');
    };

    setTimeout(() => activateStep(0), 100);

    setTimeout(() => completeStep(0), 800);
    setTimeout(() => activateStep(1), 900);
    setTimeout(() => completeStep(1), 1600);
    setTimeout(() => activateStep(2), 1700);
    setTimeout(() => completeStep(2), 2400);

    // Переход к результатам
    setTimeout(async () => {
        await generateResults();
        goToStep(4);
    }, 2800);
}

// Генерация результатов
async function generateResults() {
    try {
        // Получаем рекомендации от backend
        const productIds = state.products.map(p => p.id);
        const recommendations = await api.getRecommendations(
            state.userId,
            null,
            null,
            productIds
        );
        
        console.log('Рекомендации:', recommendations);
        
        if (!recommendations.length) {
            elements.resultsGrid.innerHTML = `
                <p class="subtitle">Пока нет мэтчей от других пользователей с похожими тоналками.</p>
                <p class="subtitle" style="margin-top:12px;opacity:0.85;">Твой выбор уже сохранён в базе — рекомендации появятся, когда накопится больше данных от сообщества.</p>`;
            window.currentRecommendations = [];
            return;
        }

        elements.resultsGrid.innerHTML = recommendations.map((rec, idx) => {
            const img = fixProductImage(rec.product.image_url);
            const url = rec.product.product_url || '#';
            return `
            <div class="result-card">
                <div class="result-rank">${idx + 1}</div>
                <div class="result-image">
                    <img src="${img}" alt="${rec.product.shade}" loading="lazy">
                </div>
                <div class="result-brand">${rec.product.brand}</div>
                <div class="result-line">${rec.product.line}</div>
                <div class="result-shade">${rec.product.shade}</div>
                ${rec.product.price ? `<div class="result-price">${Math.round(rec.product.price)} ₽</div>` : ''}
                <button class="btn-buy" type="button" data-url="${url.replace(/"/g, '&quot;')}">Купить</button>
            </div>`;
        }).join('');

        elements.resultsGrid.querySelectorAll('.btn-buy').forEach((btn) => {
            btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-url');
                if (url && url !== '#') window.open(url, '_blank');
            });
        });

        window.currentRecommendations = recommendations.map((rec) => ({
            brand: rec.product.brand,
            line: rec.product.line,
            shade: rec.product.shade,
            image: fixProductImage(rec.product.image_url),
            price: rec.product.price ? Math.round(rec.product.price) : null,
            url: rec.product.product_url || '#',
        }));
    } catch (error) {
        console.error('Ошибка генерации рекомендаций:', error);
        elements.resultsGrid.innerHTML = '<p>Ошибка загрузки рекомендаций. Попробуйте позже.</p>';
    }
}

async function downloadRecommendations() {
    if (!window.currentRecommendations || window.currentRecommendations.length === 0) {
        alert('Нет рекомендаций для скачивания');
        return;
    }

    const container = document.createElement('div');
    container.style.cssText = 'width:210mm;min-height:297mm;padding:20px;background:#fff;font-family:Inter,Arial,sans-serif;position:fixed;top:-9999px;left:-9999px;';

    let html = `
        <div style="text-align:center;margin-bottom:30px;">
            <h1 style="font-size:32px;margin-bottom:10px;color:#0f0f0f;">Скинкод</h1>
            <p style="font-size:18px;color:#646464;">Твоя подборка тональных средств</p>
        </div>`;

    window.currentRecommendations.forEach((prod) => {
        html += `
            <div style="display:flex;align-items:center;margin-bottom:20px;">
                <img src="${prod.image}" alt="" style="width:60px;height:80px;object-fit:contain;margin-right:20px;">
                <div>
                    <div style="font-weight:600;">${prod.brand} — ${prod.line}</div>
                    <div>Оттенок: ${prod.shade}</div>
                    ${prod.price ? `<div>Цена: ${prod.price} ₽</div>` : ''}
                </div>
            </div>`;
    });

    container.innerHTML = html;
    document.body.appendChild(container);

    await Promise.all([...container.querySelectorAll('img')].map((img) => new Promise((resolve) => {
        if (img.complete) resolve();
        else { img.onload = resolve; img.onerror = resolve; }
    })));

    try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width * ratio, canvas.height * ratio);
        doc.save(`skinkod-podborka-${Date.now()}.pdf`);
    } catch (error) {
        console.error('PDF error:', error);
        alert('Ошибка при генерации PDF');
    } finally {
        document.body.removeChild(container);
    }
}

function showHelpModal(type) {
    const modal = document.getElementById('help-modal-overlay');
    const title = document.getElementById('help-modal-title');
    const content = document.getElementById('help-modal-content');
    const helpData = {
        undertone: {
            title: 'Как определить подтон кожи?',
            content: '<strong>Теплый:</strong> зелёные вены, золото смотрится лучше.<br><br><strong>Холодный:</strong> сине-фиолетовые вены, серебро.<br><br><strong>Нейтральный:</strong> смешанные вены.<br><br><strong>Оливковый:</strong> зеленоватый подтон кожи.',
        },
        skin: {
            title: 'Как определить тип кожи?',
            content: '<strong>Сухая:</strong> стянутость, шелушение.<br><br><strong>Жирная:</strong> блеск в Т-зоне.<br><br><strong>Комбинированная:</strong> жирная Т-зона, сухие щёки.<br><br><strong>Нормальная:</strong> ровный комфортный баланс.',
        },
    };
    title.textContent = helpData[type].title;
    content.innerHTML = helpData[type].content;
    modal.classList.add('active');
}

function closeHelpModal() {
    document.getElementById('help-modal-overlay')?.classList.remove('active');
}

// Сброс приложения
async function resetApp() {
    state.undertone = null;
    state.skinType = null;
    state.selectedProduct = null;
    state.products = [];
    state.searchResults = [];
    
    elements.undertoneBtns.forEach(b => b.classList.remove('selected'));
    elements.skinBtns.forEach(b => b.classList.remove('selected'));
    elements.btnStep1_5.disabled = true;
    
    if (elements.brandSearch) elements.brandSearch.value = '';
    if (elements.modelSearch) elements.modelSearch.value = '';
    if (elements.shadeSearch) elements.shadeSearch.value = '';
    renderSearchResults(state.searchResults);
    updateSearchHint('Пока можно выбрать из первых продуктов каталога или начать печатать в полях поиска.');
    updateSelectedProductView();
    
    renderProducts();
    updateProductCount();
    updateFindButton();
    updateAddButton();
    
    goToStep(1);
}

window.goToStep = goToStep;
window.findMatches = findMatches;
window.addProduct = addProduct;
window.removeProduct = removeProduct;
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.downloadRecommendations = downloadRecommendations;

document.addEventListener('DOMContentLoaded', () => {
    init();
    animateTrustNumbers();
    initScrollAnimations();
});

function animateTrustNumbers() {
    document.querySelectorAll('.number-value').forEach((element) => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const target = parseInt(element.getAttribute('data-target'), 10);
                const suffix = element.getAttribute('data-suffix') || '';
                let current = 0;
                const step = target / 80;
                const tick = () => {
                    current += step;
                    if (current < target) {
                        element.innerHTML = Math.floor(current) + suffix;
                        requestAnimationFrame(tick);
                    } else {
                        element.innerHTML = target + suffix;
                    }
                };
                tick();
                observer.unobserve(element);
            });
        }, { threshold: 0.5 });
        observer.observe(element);
    });
}

function initScrollAnimations() {
    document.querySelectorAll('.step-item-new, .trust-numbers').forEach((el) => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        observer.observe(el);
    });
}

function handleStartQueryParam() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('start') !== 'true') return;
    goToStep(1.5);
    window.history.replaceState({}, document.title, window.location.pathname);
}

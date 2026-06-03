function handleLineFocus() {
    if (elements.lineSuggestions && state.lines.length) {
        renderLineSuggestions(state.lines);
    }
}

function handleLineBlur() {
    setTimeout(() => {
        elements.lineSuggestions?.classList.remove('show');
    }, 120);
}

function filterLineMatches(value) {
    if (!value) return state.lines;
    const lower = value.toLowerCase();
    return state.lines.filter((line) => line.toLowerCase().includes(lower));
}

function renderLineSuggestions(lines) {
    if (!elements.lineSuggestions) return;
    if (!lines.length) {
        elements.lineSuggestions.innerHTML = '<div class="line-suggestion-item" style="cursor:default">Нет линеек</div>';
        elements.lineSuggestions.classList.add('show');
        return;
    }

    const firstProductByLine = lines.map((line) => {
        return state.allProducts.find((p) => p.brand === state.selectedBrand && p.line === line);
    });

    elements.lineSuggestions.innerHTML = lines
        .map((line, index) => {
            const product = firstProductByLine[index];
            const image = product ? fixProductImage(product.image_url) : DEFAULT_PRODUCT_IMAGE;
            return `
                <div class="line-suggestion-item" data-line="${line}">
                    <img src="${image}" alt="${line}">
                    <div class="line-suggestion-text">
                        <strong>${line}</strong>
                        <span>${state.selectedBrand || ''}</span>
                    </div>
                </div>
            `;
        })
        .join('');

    elements.lineSuggestions.classList.add('show');

    elements.lineSuggestions.querySelectorAll('.line-suggestion-item').forEach((item) => {
        item.addEventListener('mousedown', (event) => {
            event.preventDefault();
            const line = item.getAttribute('data-line');
            if (!line) return;
            elements.lineInput.value = line;
            elements.lineSuggestions.classList.remove('show');
            handleLineInput();
        });
    });
}

// Состояние приложения с интеграцией backend API
const DEFAULT_PRODUCT_IMAGE = 'Скинкод%20фотки%20сайт/example.png';

if (typeof api === 'undefined') {
    console.error('API объект не найден! Проверьте загрузку api.js');
}

function resetLineInput(message = 'Сначала выбери бренд') {
    state.selectedLine = null;
    state.lines = [];
    if (elements.lineInput) {
        elements.lineInput.value = '';
        elements.lineInput.disabled = true;
        elements.lineInput.placeholder = message;
        delete elements.lineInput.dataset.selected;
    }
    if (elements.lineOptions) {
        elements.lineOptions.innerHTML = '';
    }
    if (elements.lineSuggestions) {
        elements.lineSuggestions.innerHTML = '';
        elements.lineSuggestions.classList.remove('show');
    }
}

function resetShadeInput(message = 'Сначала выбери линейку') {
    state.currentLineProducts = [];
    if (elements.shadeInput) {
        elements.shadeInput.value = '';
        elements.shadeInput.disabled = true;
        elements.shadeInput.placeholder = message;
        delete elements.shadeInput.dataset.productId;
    }
    if (elements.shadeOptions) {
        elements.shadeOptions.innerHTML = '';
    }
}

function findMatch(value, list) {
    if (!value) return null;
    const lower = value.toLowerCase();
    return list.find((item) => item.toLowerCase() === lower) || null;
}

function handleBrandInput() {
    if (!elements.brandInput) return;
    const rawValue = elements.brandInput.value.trim();
    const match = findMatch(rawValue, state.brands);
    if (!match) {
        state.selectedBrand = null;
        delete elements.brandInput.dataset.selected;
        resetLineInput();
        resetShadeInput();
        updateAddButton();
        return;
    }

    if (state.selectedBrand !== match) {
        state.selectedBrand = match;
        elements.brandInput.value = match;
        elements.brandInput.dataset.selected = match;
        prepareLinesForBrand(match);
    }
}

function prepareLinesForBrand(brand) {
    const brandProducts = state.allProducts.filter((p) => p.brand === brand);
    const lines = [...new Set(brandProducts.map((p) => p.line))].sort();
    state.lines = lines;

    if (elements.lineOptions) {
        elements.lineOptions.innerHTML = lines.map((line) => `<option value="${line}"></option>`).join('');
    }

    if (elements.lineInput) {
        elements.lineInput.disabled = !lines.length;
        elements.lineInput.value = '';
        elements.lineInput.placeholder = lines.length ? 'Начни вводить линейку' : 'Нет доступных линеек';
    }

    renderLineSuggestions(lines);
    resetShadeInput(lines.length ? 'Сначала выбери линейку' : 'Нет доступных оттенков');
    updateAddButton();
}

function handleLineInput() {
    if (!elements.lineInput || !state.selectedBrand) return;
    const rawValue = elements.lineInput.value.trim();
    renderLineSuggestions(filterLineMatches(rawValue));
    const match = findMatch(rawValue, state.lines);
    if (!match) {
        state.selectedLine = null;
        resetShadeInput(state.lines.length ? 'Выбери линейку из списка' : 'Сначала выбери бренд');
        updateAddButton();
        return;
    }

    if (state.selectedLine !== match) {
        state.selectedLine = match;
        elements.lineInput.value = match;
        elements.lineInput.dataset.selected = match;
        populateShadeOptions();
    }
}

function populateShadeOptions() {
    if (!state.selectedBrand || !state.selectedLine) return;
    const lineProducts = state.allProducts.filter(
        (p) => p.brand === state.selectedBrand && p.line === state.selectedLine
    );
    state.currentLineProducts = lineProducts;

    if (elements.shadeOptions) {
        elements.shadeOptions.innerHTML = lineProducts
            .map((product) => `<option value="${product.shade}"></option>`)
            .join('');
    }

    if (elements.shadeInput) {
        elements.shadeInput.disabled = !lineProducts.length;
        elements.shadeInput.value = '';
        elements.shadeInput.placeholder = lineProducts.length ? 'Начни вводить оттенок' : 'Нет оттенков';
        delete elements.shadeInput.dataset.productId;
    }

    updateAddButton();
}

function handleShadeInput() {
    if (!elements.shadeInput) return;
    const match = state.currentLineProducts.find(
        (product) => product.shade.toLowerCase() === elements.shadeInput.value.trim().toLowerCase()
    );

    if (match) {
        elements.shadeInput.value = match.shade;
        elements.shadeInput.dataset.productId = match.id;
    } else {
        delete elements.shadeInput.dataset.productId;
    }

    updateAddButton();
}

function fixProductImage() {
    return DEFAULT_PRODUCT_IMAGE;
}

function formatConfidenceLabel(rec) {
    if (!rec) return '';
    const parts = [];
    if (rec.confidence_label) {
        parts.push(rec.confidence_label);
    }
    if (typeof rec.support_count === 'number' && rec.support_count > 0) {
        parts.push(`${rec.support_count} ${pluralize(rec.support_count, ['связка', 'связки', 'связок'])}`);
    }
    return parts.join(' · ');
}

function pluralize(value, forms) {
    const absValue = Math.abs(value) % 100;
    const lastDigit = absValue % 10;
    if (absValue > 10 && absValue < 20) return forms[2];
    if (lastDigit > 1 && lastDigit < 5) return forms[1];
    if (lastDigit === 1) return forms[0];
    return forms[2];
}

const WIZARD_STEP_IDS = ['step-1', 'step-1-5', 'step-2', 'step-3', 'step-4'];

const state = {
    userId: null,  // ID пользователя из backend
    anonymousId: localStorage.getItem('skincode_anonymous_id') || null,
    undertone: null,
    skinType: null,
    selectedBrand: null,
    selectedLine: null,
    products: [],  // добавленные продукты пользователя
    allProducts: [],  // все продукты из backend для селекторов
    brands: [],
    lines: [],
    currentLineProducts: [],
    maxProducts: 3,
    isProductsLoading: true,
    productsLoadError: false
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
    brandInput: document.getElementById('brand-input'),
    brandOptions: document.getElementById('brand-options'),
    lineInput: document.getElementById('line-input'),
    lineOptions: document.getElementById('line-options'),
    lineSuggestions: document.getElementById('line-suggestions'),
    shadeInput: document.getElementById('shade-input'),
    shadeOptions: document.getElementById('shade-options'),
    brandLoadingHint: document.getElementById('brand-loading-hint'),
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

updateBrandLoadingUI();

// Инициализация
async function init() {
    console.log('Инициализация приложения...');
    console.log('DOM готов при выполнении init():', document.readyState);
    console.log('DOM элементы:', {
        btnStart: elements.btnStart,
        undertoneBtns: elements.undertoneBtns.length,
        skinBtns: elements.skinBtns.length
    });
    
    // Сразу настраиваем UI — кнопки должны работать до завершения загрузки
    setupEventListeners();
    initWizardSteps();
    handleStartQueryParam();

    try {
        // Параллельно запускаем создание пользователя и загрузку продуктов
        await Promise.all([initUser(), loadProductsData()]);
        populateBrandSelect();
        console.log('Инициализация завершена');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

async function ensureUser() {
    if (state.userId) return true;
    if (typeof api === 'undefined') return false;
    try {
        const user = await api.createUser(state.anonymousId);
        state.userId = user.id;
        if (user.anonymous_id) {
            state.anonymousId = user.anonymous_id;
            localStorage.setItem('skincode_anonymous_id', user.anonymous_id);
        }
        return true;
    } catch (error) {
        console.error('ensureUser failed:', error);
        return false;
    }
}

function resetUserSession() {
    state.userId = null;
    state.anonymousId = null;
    try {
        localStorage.removeItem('skincode_anonymous_id');
    } catch (storageError) {
        console.warn('Не удалось очистить anonymous_id:', storageError);
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

// Загрузка данных продуктов
async function loadProductsData() {
    setProductsLoadingState(true);
    try {
        const pageSize = 500;
        let skip = 0;
        const all = [];
        while (true) {
            const batch = await api.getProducts(skip, pageSize);
            if (!batch.length) break;
            all.push(...batch);
            if (batch.length < pageSize) break;
            skip += pageSize;
        }
        state.allProducts = all.map((product) => ({
            ...product,
            image_url: DEFAULT_PRODUCT_IMAGE
        }));
        state.brands = [...new Set(state.allProducts.map(p => p.brand))].sort();
        state.productsLoadError = false;
        console.log('Загружено продуктов:', state.allProducts.length);
    } catch (error) {
        state.productsLoadError = true;
        console.error('Ошибка загрузки продуктов:', error);
    } finally {
        state.isProductsLoading = false;
        updateBrandLoadingUI();
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

    window.addEventListener('scroll', handleMenuButtonScroll, { passive: true });
    handleMenuButtonScroll();

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

    // Поиск брендов/линеек/оттенков
    elements.brandInput?.addEventListener('input', handleBrandInput);
    elements.brandInput?.addEventListener('change', handleBrandInput);
    elements.lineInput?.addEventListener('input', handleLineInput);
    elements.lineInput?.addEventListener('focus', handleLineFocus);
    elements.lineInput?.addEventListener('blur', handleLineBlur);
    elements.shadeInput?.addEventListener('input', handleShadeInput);
    elements.shadeInput?.addEventListener('change', handleShadeInput);

    // Этап 4: скачать подборку
    if (elements.btnDownload) elements.btnDownload.addEventListener('click', downloadRecommendations);

    // Этап 4: начать заново
    if (elements.btnRestart) elements.btnRestart.addEventListener('click', resetApp);

    console.log('Обработчики событий настроены');
}

// Заполнение списка брендов
function populateBrandSelect() {
    if (!elements.brandOptions) return;
    if (!state.brands.length) {
        updateBrandLoadingUI();
        return;
    }

    elements.brandOptions.innerHTML = state.brands
        .map((brand) => `<option value="${brand}"></option>`)
        .join('');
    if (elements.brandInput) {
        elements.brandInput.value = '';
    }
    updateBrandLoadingUI();
}

function setProductsLoadingState(isLoading) {
    state.isProductsLoading = isLoading;
    if (isLoading) {
        state.productsLoadError = false;
    }
    updateBrandLoadingUI();
}

function updateBrandLoadingUI() {
    if (!elements.brandInput) return;
    const isLoading = state.isProductsLoading;
    const hasError = state.productsLoadError;
    const hasData = state.brands.length > 0;

    const shouldDisable = isLoading || hasError || !hasData;
    elements.brandInput.disabled = shouldDisable;
    elements.brandInput.classList.toggle('is-loading', isLoading);
    elements.brandInput.placeholder = isLoading
        ? 'Загружаем бренды...'
        : hasError
            ? 'Ошибка загрузки брендов'
            : hasData
                ? 'Начни вводить бренд'
                : 'Каталог пока пуст';

    if (elements.brandLoadingHint) {
        let text = 'Выбери бренд, линейку и оттенок';
        if (hasError) {
            text = 'Не удалось загрузить бренды. Обнови страницу и попробуй снова.';
        } else if (isLoading) {
            text = 'Загружаем бренды...';
        } else if (hasData) {
            const count = state.brands.length;
            text = `Выбери бренд — доступно ${count} ${pluralize(count, ['бренд', 'бренда', 'брендов'])}`;
        }
        elements.brandLoadingHint.textContent = text;
        elements.brandLoadingHint.classList.toggle('is-loading', isLoading);
        elements.brandLoadingHint.classList.toggle('is-error', hasError);
    }

    if (shouldDisable) {
        resetLineInput();
        resetShadeInput();
        elements.btnAdd?.setAttribute('disabled', 'disabled');
    }
}

// Выбор подтона
function selectUndertone(btn) {
    elements.undertoneBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.undertone = btn.dataset.value;
    checkStep1_5Complete();
    // Сохраняем сразу — не ждём финала флоу
    if (state.userId) {
        api.updateUser(state.userId, state.undertone, null).catch(e => console.warn('updateUser undertone:', e));
    }
}

// Выбор типа кожи
function selectSkinType(btn) {
    elements.skinBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.skinType = btn.dataset.value;
    checkStep1_5Complete();
    // Сохраняем сразу — не ждём финала флоу
    if (state.userId) {
        api.updateUser(state.userId, null, state.skinType).catch(e => console.warn('updateUser skin_type:', e));
    }
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

function handleMenuButtonScroll() {
    const menuBtn = elements.menuBtn;
    if (!menuBtn) return;

    if (menuBtn.style.display === 'none') {
        menuBtn.classList.remove('scrolled');
        return;
    }

    const showThreshold = 150;
    if ((window.scrollY || window.pageYOffset) >= showThreshold) {
        menuBtn.classList.add('scrolled');
    } else {
        menuBtn.classList.remove('scrolled');
    }
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
            menuBtn.classList.remove('scrolled');
        } else {
            menuBtn.style.display = 'block';
            handleMenuButtonScroll();
        }
    }

    updateProgressBar(stepNum);
}

// Обновление состояния кнопки добавления
function updateAddButton() {
    const hasBrand = !!state.selectedBrand;
    const hasLine = !!state.selectedLine;
    const shadeId = elements.shadeInput?.dataset.productId;
    const canAdd = hasBrand && hasLine && shadeId &&
                   state.products.length < state.maxProducts;
    elements.btnAdd.disabled = !canAdd;
}

// Добавление продукта
async function addProduct() {
    if (state.products.length >= state.maxProducts) return;

    const productId = parseInt(elements.shadeInput?.dataset.productId || '', 10);
    if (!productId) return;

    const product = state.allProducts.find(p => p.id === productId);
    if (!product) {
        alert('Каталог ещё загружается. Подожди пару секунд и попробуй снова.');
        return;
    }

    if (state.products.some(p => p.id === productId)) {
        alert('Этот продукт уже добавлен.');
        return;
    }

    if (typeof api === 'undefined') {
        alert('API не загружен. Обнови страницу.');
        return;
    }

    if (!(await ensureUser())) {
        alert(`Не удалось создать сессию пользователя.\nAPI: ${api.baseUrl}\nПроверь, что backend запущен.`);
        return;
    }

    try {
        await api.addUserProduct(state.userId, productId);
    } catch (error) {
        console.error('Ошибка добавления продукта на сервер:', error);
        const message = error?.message || '';

        if (message.includes('User not found')) {
            resetUserSession();
            const recreated = await ensureUser();
            if (!recreated) {
                alert('Сессия устарела. Обнови страницу и попробуй снова.');
                return;
            }
            try {
                await api.addUserProduct(state.userId, productId);
            } catch (retryError) {
                console.error('Повторная попытка добавить продукт не удалась:', retryError);
                alert(retryError.message || 'Не удалось сохранить на сервер.');
                return;
            }
        } else if (message.includes('Product not found')) {
            alert('Этот продукт больше недоступен в каталоге. Обновляем список брендов.');
            await loadProductsData();
            populateBrandSelect();
            return;
        } else {
            alert(message || 'Не удалось сохранить на сервер.');
            return;
        }
    }

    state.products.push({
        id: product.id,
        brand: product.brand,
        line: product.line,
        shade: product.shade,
        hex: product.hex,
        image: fixProductImage(product.image_url)
    });

    renderProducts();
    updateProductCount();
    updateFindButton();

    if (elements.brandInput) {
        elements.brandInput.value = '';
        delete elements.brandInput.dataset.selected;
        elements.brandInput.placeholder = 'Начни вводить бренд';
    }
    state.selectedBrand = null;
    resetLineInput();
    resetShadeInput();
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
        // Обновляем данные пользователя на backend
        await api.updateUser(state.userId, state.undertone, state.skinType);
        
        // Получаем рекомендации от backend
        const productIds = state.products.map(p => p.id);
        const recommendations = await api.getRecommendations(
            state.userId,
            state.undertone,
            state.skinType,
            productIds
        );
        
        console.log('Рекомендации:', recommendations);
        
        if (!recommendations.length) {
            elements.resultsGrid.innerHTML = `
            <div class="results-empty">
                <img src="Скинкод%20фотки%20сайт/icon.png" alt="Нет совпадений" class="results-empty-icon" loading="lazy">
                <p class="results-empty-title">К сожалению, пока нет совпадений с другими пользователями</p>
                <p class="results-empty-text">Твои продукты уже сохранены — рекомендации появятся,<br>когда другие пользователи добавят похожие тональные средства.</p>
            </div>`;
            window.currentRecommendations = [];
            return;
        }

        elements.resultsGrid.innerHTML = recommendations.map((rec, idx) => {
            const img = fixProductImage(rec.product.image_url);
            const url = rec.product.product_url || '#';
            const confidenceText = formatConfidenceLabel(rec);
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
                ${confidenceText ? `<div class="result-confidence">${confidenceText}</div>` : ''}
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
            confidence: formatConfidenceLabel(rec),
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
                    ${prod.confidence ? `<div style="font-size:12px;color:#666;margin-top:4px;">${prod.confidence}</div>` : ''}
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
    state.selectedBrand = null;
    state.selectedLine = null;
    state.products = [];
    
    elements.undertoneBtns.forEach(b => b.classList.remove('selected'));
    elements.skinBtns.forEach(b => b.classList.remove('selected'));
    elements.btnStep1_5.disabled = true;
    
    if (elements.brandInput) {
        elements.brandInput.value = '';
        delete elements.brandInput.dataset.selected;
    }
    resetLineInput();
    resetShadeInput();
    
    renderProducts();
    updateProductCount();
    updateFindButton();
    
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

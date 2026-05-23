// Состояние приложения
console.log('app.js загружен');
const state = {
    undertone: null,
    skinType: null,
    products: [],
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
    brandSelect: document.getElementById('brand-select'),
    lineSelect: document.getElementById('line-select'),
    shadeSelect: document.getElementById('shade-select'),
    btnAdd: document.getElementById('btn-add'),
    btnFind: document.getElementById('btn-find'),
    productsList: document.getElementById('products-list'),
    productCount: document.getElementById('product-count'),
    resultsGrid: document.getElementById('results-grid'),
    btnRestart: document.getElementById('btn-restart'),
    menuBtn: document.getElementById('menu-btn'),
    menuModal: document.getElementById('menu-modal'),
    menuClose: document.getElementById('menu-close')
};

// Проверка инициализации
console.log('Инициализация: undertoneBtns найдено:', elements.undertoneBtns.length);
console.log('Инициализация: skinBtns найдено:', elements.skinBtns.length);

// Инициализация
function init() {
    populateBrandSelect();
    setupEventListeners();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Меню
    elements.menuBtn.addEventListener('click', openMenu);
    elements.menuClose.addEventListener('click', closeMenu);
    elements.menuModal.addEventListener('click', (e) => {
        if (e.target === elements.menuModal) closeMenu();
    });
    
    // Этап 1: начать подбор
    elements.btnStart.addEventListener('click', () => {
        console.log('Кнопка "Начать подбор" нажата');
        // Скрываем кнопку меню
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) menuBtn.style.display = 'none';
        // Скрываем только step-1
        const step1 = document.getElementById('step-1');
        if (step1) {
            step1.classList.remove('active');
            step1.style.display = 'none';
        }
        // Показываем step-1-5
        const step1_5 = document.getElementById('step-1-5');
        if (step1_5) {
            step1_5.classList.add('active');
            step1_5.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('Переход выполнен на step-1-5');
        }
    });

    // Этап 1: как это работает - скролл к секции
    elements.btnHowItWorks.addEventListener('click', () => {
        document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' });
    });

    // Этап 1: на основе чего происходит подбор - скролл к секции
    elements.btnAlgorithm.addEventListener('click', () => {
        document.getElementById('algorithm').scrollIntoView({ behavior: 'smooth' });
    });

    // Кнопки «Назад»
    elements.btnBack1_5.addEventListener('click', () => goToStep(1));
    elements.btnBack2.addEventListener('click', () => goToStep(2));
    elements.btnBack4.addEventListener('click', () => goToStep(3));

    // Закрытие меню по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    // Этап 1.5: выбор подтона
    console.log('undertoneBtns найдено:', elements.undertoneBtns.length);
    elements.undertoneBtns.forEach((btn, index) => {
        console.log('Подтон кнопка', index, btn);
        btn.addEventListener('click', () => {
            console.log('Клик по подтону:', btn.dataset.value);
            selectUndertone(btn);
        });
    });

    // Этап 1.5: выбор типа кожи
    console.log('skinBtns найдено:', elements.skinBtns.length);
    elements.skinBtns.forEach((btn, index) => {
        console.log('Тип кожи кнопка', index, btn);
        btn.addEventListener('click', () => {
            console.log('Клик по типу кожи:', btn.dataset.value);
            selectSkinType(btn);
        });
    });

    // Этап 1.5: продолжить
    elements.btnStep1_5.addEventListener('click', () => goToStep(3));

    // Этап 2: каскадные селекторы
    elements.brandSelect.addEventListener('change', onBrandChange);
    elements.lineSelect.addEventListener('change', onLineChange);
    elements.shadeSelect.addEventListener('change', onShadeChange);

    // Этап 2: добавить продукт
    elements.btnAdd.addEventListener('click', addProduct);

    // Этап 2: найти мэтчи
    elements.btnFind.addEventListener('click', findMatches);

    // Этап 4: начать заново
    elements.btnRestart.addEventListener('click', resetApp);
}

// Заполнение селектора брендов
function populateBrandSelect() {
    const brands = Object.keys(productsDB);
    elements.brandSelect.innerHTML = '<option value="">Выбери бренд</option>' +
        brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
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

// Отслеживание прокрутки для кнопки меню
// Кнопка absolute вначале (встроена в фон), становится fixed внизу при скролле
function handleMenuButtonScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    const showThreshold = 150; // порог когда показываем кнопку внизу
    
    if (scrollY >= showThreshold) {
        // Показываем кнопку внизу экрана (fixed)
        elements.menuBtn.classList.add('scrolled');
    } else {
        // Кнопка встроена в страницу (absolute), скроллится с фоном
        elements.menuBtn.classList.remove('scrolled');
    }
}

// Инициализация отслеживания прокрутки
window.addEventListener('scroll', handleMenuButtonScroll, { passive: true });
handleMenuButtonScroll();

// Обновление прогресс-бара
// Маппинг шагов: 1=подтон/кожа, 2=продукты, 3=анализ, 4=результаты
function getProgressStep(currentStep) {
    // currentStep: 1=hero, 2=подтон/кожа, 3=продукты, 4=анализ, 5=результаты
    // progress:    1=подтон/кожа, 2=продукты, 3=анализ, 4=результаты
    if (currentStep === 1) return 0; // hero - нет прогресса
    if (currentStep === 2) return 1; // подтон/кожа = шаг 1
    if (currentStep === 3) return 2; // продукты = шаг 2
    if (currentStep === 4) return 3; // анализ = шаг 3
    if (currentStep === 5) return 4; // результаты = шаг 4
    return 0;
}

function updateProgressBar(currentStep) {
    const progressBars = document.querySelectorAll('.progress-bar');
    const progressStep = getProgressStep(currentStep);
    
    progressBars.forEach(bar => {
        const steps = bar.querySelectorAll('.progress-step');
        const lines = bar.querySelectorAll('.progress-line');
        
        steps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            
            // Для шага 4 (результаты) — шаг 4 active, остальные completed
            // Для остальных — текущий active, предыдущие completed
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
            // Для шага 4 — все линии active
            // Для остальных — линии до текущего шага
            if (progressStep === 4) {
                line.classList.add('active');
            } else if (index < progressStep - 1) {
                line.classList.add('active');
            }
        });
    });
}

// Переход между этапами
function goToStep(stepNum) {
    elements.steps.forEach((step, index) => {
        step.classList.remove('active');
    });

    // Находим нужный шаг по ID
    const stepId = stepNum === 1.5 ? 'step-1-5' : `step-${stepNum}`;
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    // Прокрутка вверх при переходе на новый шаг
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Управляем видимостью кнопки меню
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        // Скрываем меню на этапах формы (1.5, 2, 3, 4), показываем на главной (1)
        if (stepNum === 1.5 || stepNum === 2 || stepNum === 3 || stepNum === 4) {
            menuBtn.style.display = 'none';
        } else {
            menuBtn.style.display = 'block';
        }
    }

    // Обновляем прогресс-бар
    updateProgressBar(stepNum);

    if (stepNum === 4) {
        generateResults();
    }
}

// Обработчик смены бренда
function onBrandChange() {
    const brand = elements.brandSelect.value;
    
    elements.lineSelect.disabled = !brand;
    elements.shadeSelect.disabled = true;
    elements.shadeSelect.innerHTML = '<option value="">Сначала выбери линейку</option>';
    
    if (brand) {
        const lines = Object.keys(productsDB[brand].lines);
        elements.lineSelect.innerHTML = '<option value="">Выбери линейку</option>' +
            lines.map(line => `<option value="${line}">${line}</option>`).join('');
    } else {
        elements.lineSelect.innerHTML = '<option value="">Сначала выбери бренд</option>';
    }
    
    updateAddButton();
}

// Обработчик смены линейки
function onLineChange() {
    const brand = elements.brandSelect.value;
    const line = elements.lineSelect.value;
    
    elements.shadeSelect.disabled = !line;
    
    if (line && brand) {
        const shades = productsDB[brand].lines[line];
        elements.shadeSelect.innerHTML = '<option value="">Выбери оттенок</option>' +
            shades.map((shade, idx) => 
                `<option value="${idx}">${shade.shade}</option>`
            ).join('');
    } else {
        elements.shadeSelect.innerHTML = '<option value="">Сначала выбери линейку</option>';
    }
    
    updateAddButton();
}

// Обработчик выбора оттенка
function onShadeChange() {
    updateAddButton();
}

// Обновление состояния кнопки добавления
function updateAddButton() {
    const canAdd = elements.brandSelect.value && 
                   elements.lineSelect.value && 
                   elements.shadeSelect.value !== '' &&
                   state.products.length < state.maxProducts;
    elements.btnAdd.disabled = !canAdd;
}

// Добавление продукта
function addProduct() {
    if (state.products.length >= state.maxProducts) return;

    const brand = elements.brandSelect.value;
    const line = elements.lineSelect.value;
    const shadeIdx = elements.shadeSelect.value;
    const shade = productsDB[brand].lines[line][shadeIdx];

    const product = {
        id: Date.now(),
        brand,
        line,
        shade: shade.shade,
        hex: shade.hex,
        image: shade.image
    };

    state.products.push(product);
    renderProducts();
    updateAddButton();
    updateProductCount();
    updateFindButton();

    // Сброс селекторов
    elements.shadeSelect.value = '';
    updateAddButton();
}

// Удаление продукта
function removeProduct(id) {
    state.products = state.products.filter(p => p.id !== id);
    renderProducts();
    updateAddButton();
    updateProductCount();
    updateFindButton();
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
function findMatches() {
    goToStep(4); // ЭТАП 3: Анализ (index 3)
    
    // Анимация шагов загрузки
    const loadingSteps = document.querySelectorAll('.loading-step');
    loadingSteps.forEach(step => step.classList.remove('active', 'completed'));
    
    // Шаг 1: Изучаем продукты (0-800ms)
    setTimeout(() => {
        loadingSteps[0]?.classList.add('active');
    }, 100);
    
    setTimeout(() => {
        loadingSteps[0]?.classList.remove('active');
        loadingSteps[0]?.classList.add('completed');
    }, 800);
    
    // Шаг 2: Сопоставляем оттенки (800-1600ms)
    setTimeout(() => {
        loadingSteps[1]?.classList.add('active');
    }, 900);
    
    setTimeout(() => {
        loadingSteps[1]?.classList.remove('active');
        loadingSteps[1]?.classList.add('completed');
    }, 1600);
    
    // Шаг 3: Подбираем мэтчи (1600-2400ms)
    setTimeout(() => {
        loadingSteps[2]?.classList.add('active');
    }, 1700);
    
    setTimeout(() => {
        loadingSteps[2]?.classList.remove('active');
        loadingSteps[2]?.classList.add('completed');
    }, 2400);
    
    // Переход к результатам (ЭТАП 4, index 4)
    setTimeout(() => {
        goToStep(5);
    }, 2800);
}

// Генерация результатов
function generateResults() {
    const recommendations = getRecommendations();
    
    elements.resultsGrid.innerHTML = recommendations.map((product, idx) => `
        <div class="result-card">
            <div class="result-rank">${idx + 1}</div>
            <div class="result-image">
                <img src="${product.image}" alt="${product.shade}" loading="lazy">
            </div>
            <div class="result-brand">${product.brand}</div>
            <div class="result-line">${product.line}</div>
            <div class="result-shade">${product.shade}</div>
            <button class="btn-buy" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(product.brand + ' ' + product.line + ' ' + product.shade)}', '_blank')">Купить</button>
        </div>
    `).join('');
}

// Получение рекомендаций
function getRecommendations() {
    const results = [];
    const addedKeys = new Set();
    
    // Получаем категории оттенков пользователя
    const userCategories = state.products.map(p => getShadeCategory(p.shade)).filter(Boolean);
    
    // Собираем все доступные продукты
    const allProducts = [];
    Object.keys(productsDB).forEach(brand => {
        Object.keys(productsDB[brand].lines).forEach(line => {
            productsDB[brand].lines[line].forEach(shade => {
                // Исключаем уже добавленные продукты
                const isAdded = state.products.some(p => 
                    p.brand === brand && p.line === line && p.shade === shade.shade
                );
                
                if (!isAdded) {
                    const category = getShadeCategory(shade.shade);
                    const matchScore = userCategories.includes(category) ? 2 : 
                                      userCategories.some(c => isSimilarCategory(c, category)) ? 1 : 0;
                    
                    allProducts.push({
                        brand,
                        line,
                        shade: shade.shade,
                        hex: shade.hex,
                        image: shade.image,
                        category,
                        matchScore
                    });
                }
            });
        });
    });
    
    // Сортируем по релевантности и выбираем топ-5
    allProducts.sort((a, b) => b.matchScore - a.matchScore);
    
    return allProducts.slice(0, 5);
}

// Определение категории оттенка
function getShadeCategory(shadeName) {
    for (const [category, shades] of Object.entries(shadeMapping)) {
        if (shades.some(s => shadeName.toLowerCase().includes(s.toLowerCase()))) {
            return category;
        }
    }
    return null;
}

// Проверка похожести категорий
function isSimilarCategory(cat1, cat2) {
    if (!cat1 || !cat2) return false;
    const tone1 = cat1.split('_')[1];
    const tone2 = cat2.split('_')[1];
    return tone1 === tone2;
}

// Сброс приложения
function resetApp() {
    state.undertone = null;
    state.skinType = null;
    state.products = [];
    
    elements.undertoneBtns.forEach(b => b.classList.remove('selected'));
    elements.skinBtns.forEach(b => b.classList.remove('selected'));
    elements.btnStep1_5.disabled = true;
    
    elements.brandSelect.value = '';
    elements.lineSelect.innerHTML = '<option value="">Сначала выбери бренд</option>';
    elements.lineSelect.disabled = true;
    elements.shadeSelect.innerHTML = '<option value="">Сначала выбери линейку</option>';
    elements.shadeSelect.disabled = true;
    
    renderProducts();
    updateProductCount();
    updateFindButton();
    
    goToStep(1);
}

// Запуск
console.log('Запуск init()');
init();
console.log('init() завершен');

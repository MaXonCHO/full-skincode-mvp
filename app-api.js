// Состояние приложения с интеграцией backend API
console.log('app-api.js загружен');
console.log('DOM готов:', document.readyState);

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
    lineDropdownBtn: document.getElementById('line-dropdown-btn'),
    lineDropdownList: document.getElementById('line-dropdown-list'),
    lineSelectedText: document.getElementById('line-selected-text'),
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

// Инициализация
async function init() {
    console.log('Инициализация приложения...');
    console.log('DOM элементы:', {
        btnStart: elements.btnStart,
        undertoneBtns: elements.undertoneBtns.length,
        skinBtns: elements.skinBtns.length
    });
    
    try {
        // Создаем или получаем пользователя
        await initUser();
        
        // Загружаем данные продуктов
        await loadProductsData();
        
        // Заполняем селекторы
        populateBrandSelect();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        console.log('Инициализация завершена');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

// Инициализация пользователя
async function initUser() {
    try {
        // Создаем нового пользователя (для MVP всегда создаем нового)
        const user = await api.createUser(state.anonymousId);
        state.userId = user.id;
        state.anonymousId = user.anonymous_id;
        localStorage.setItem('skincode_anonymous_id', user.anonymous_id);
        console.log('Создан новый пользователь:', state.userId);
    } catch (error) {
        console.error('Ошибка инициализации пользователя:', error);
    }
}

// Загрузка данных продуктов
async function loadProductsData() {
    try {
        state.allProducts = await api.getProducts(0, 1000);
        
        // Извлекаем уникальные бренды
        const brandSet = new Set(state.allProducts.map(p => p.brand));
        state.brands = Array.from(brandSet).sort();
        
        console.log('Загружено продуктов:', state.allProducts.length);
        console.log('Бренды:', state.brands);
    } catch (error) {
        console.error('Ошибка загрузки продуктов:', error);
    }
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
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) menuBtn.style.display = 'none';
        
        const step1 = document.getElementById('step-1');
        if (step1) {
            step1.classList.remove('active');
            step1.style.display = 'none';
        }
        
        const step1_5 = document.getElementById('step-1-5');
        if (step1_5) {
            step1_5.classList.add('active');
            step1_5.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Этап 1: как это работает
    elements.btnHowItWorks.addEventListener('click', () => {
        document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' });
    });

    // Этап 1: алгоритм
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

    // Этап 1.5: продолжить
    elements.btnStep1_5.addEventListener('click', () => goToStep(3));

    // Этап 2: каскадные селекторы
    elements.brandSelect.addEventListener('change', onBrandChange);
    elements.lineDropdownBtn.addEventListener('click', toggleLineDropdown);
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
    elements.brandSelect.innerHTML = '<option value="">Выбери бренд</option>' +
        state.brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
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
function getProgressStep(currentStep) {
    if (currentStep === 1) return 0;
    if (currentStep === 2) return 1;
    if (currentStep === 3) return 2;
    if (currentStep === 4) return 3;
    if (currentStep === 5) return 4;
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

// Переход между этапами
function goToStep(stepNum) {
    elements.steps.forEach((step) => {
        step.classList.remove('active');
    });

    const stepId = stepNum === 1.5 ? 'step-1-5' : `step-${stepNum}`;
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.add('active');
    }

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

    if (stepNum === 4) {
        generateResults();
    }
}

// Обработчик смены бренда
function onBrandChange() {
    const brand = elements.brandSelect.value;
    state.selectedBrand = brand;
    state.selectedLine = null;
    
    console.log('onBrandChange - выбран бренд:', brand);
    console.log('lineDropdownBtn:', elements.lineDropdownBtn);
    console.log('lineDropdownList:', elements.lineDropdownList);
    
    elements.lineDropdownBtn.disabled = !brand;
    elements.shadeSelect.disabled = true;
    elements.shadeSelect.innerHTML = '<option value="">Сначала выбери линейку</option>';
    
    if (brand) {
        const brandProducts = state.allProducts.filter(p => p.brand === brand);
        const lines = [...new Set(brandProducts.map(p => p.line))];
        
        console.log('Найдено линеек:', lines.length, lines);
        
        elements.lineSelectedText.textContent = 'Выбери линейку';
        elements.lineDropdownList.innerHTML = '';
        
        lines.forEach(line => {
            // Get first shade image for this line
            const lineProducts = brandProducts.filter(p => p.line === line);
            const firstShade = lineProducts[0];
            const image = firstShade ? firstShade.image_url : '';
            
            const item = document.createElement('div');
            item.className = 'native-dropdown-item';
            item.onclick = () => selectLine(line, image);
            item.innerHTML = `<img src="${image}" alt="" style="width:28px;height:36px;object-fit:contain;"><span>${line}</span>`;
            elements.lineDropdownList.appendChild(item);
        });
        
        console.log('Dropdown заполнен, элементов:', elements.lineDropdownList.children.length);
    } else {
        elements.lineSelectedText.textContent = 'Сначала выбери бренд';
        elements.lineDropdownList.innerHTML = '';
    }
    
    updateAddButton();
}

// Функции для кастомного dropdown линеек
function toggleLineDropdown() {
    elements.lineDropdownList.classList.toggle('show');
    elements.lineDropdownBtn.classList.toggle('open');
}

function selectLine(line, image) {
    state.selectedLine = line;
    elements.lineSelectedText.textContent = line;
    elements.lineDropdownList.classList.remove('show');
    elements.lineDropdownBtn.classList.remove('open');
    
    // Populate shades
    elements.shadeSelect.disabled = false;
    updateAddButton();
    
    if (state.selectedBrand) {
        const lineProducts = state.allProducts.filter(p => p.brand === state.selectedBrand && p.line === line);
        elements.shadeSelect.innerHTML = '<option value="">Выбери оттенок</option>' +
            lineProducts.map(p => `<option value="${p.id}">${p.shade}</option>`).join('');
    }
    
    console.log('Линейка:', line);
}

// Закрытие dropdown при клике вне его
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('line-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        elements.lineDropdownList.classList.remove('show');
        elements.lineDropdownBtn.classList.remove('open');
    }
});

// Обработчик выбора оттенка
function onShadeChange() {
    updateAddButton();
}

// Обновление состояния кнопки добавления
function updateAddButton() {
    const canAdd = elements.brandSelect.value && 
                   state.selectedLine && 
                   elements.shadeSelect.value !== '' &&
                   state.products.length < state.maxProducts;
    elements.btnAdd.disabled = !canAdd;
}

// Добавление продукта
async function addProduct() {
    if (state.products.length >= state.maxProducts) return;

    const productId = parseInt(elements.shadeSelect.value);
    const product = state.allProducts.find(p => p.id === productId);
    
    if (!product) return;

    try {
        // Добавляем продукт на backend
        await api.addUserProduct(state.userId, productId);
        
        const productData = {
            id: product.id,
            brand: product.brand,
            line: product.line,
            shade: product.shade,
            hex: product.hex,
            image: product.image_url
        };

        state.products.push(productData);
        renderProducts();
        updateAddButton();
        updateProductCount();
        updateFindButton();

        // Сброс селекторов
        elements.shadeSelect.value = '';
        updateAddButton();
        
        console.log('Продукт добавлен:', productData);
    } catch (error) {
        console.error('Ошибка добавления продукта:', error);
    }
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
    goToStep(4);
    
    // Анимация шагов загрузки
    const loadingSteps = document.querySelectorAll('.loading-step');
    loadingSteps.forEach(step => step.classList.remove('active', 'completed'));
    
    setTimeout(() => {
        loadingSteps[0]?.classList.add('active');
    }, 100);
    
    setTimeout(() => {
        loadingSteps[0]?.classList.remove('active');
        loadingSteps[0]?.classList.add('completed');
    }, 800);
    
    setTimeout(() => {
        loadingSteps[1]?.classList.add('active');
    }, 900);
    
    setTimeout(() => {
        loadingSteps[1]?.classList.remove('active');
        loadingSteps[1]?.classList.add('completed');
    }, 1600);
    
    setTimeout(() => {
        loadingSteps[2]?.classList.add('active');
    }, 1700);
    
    setTimeout(() => {
        loadingSteps[2]?.classList.remove('active');
        loadingSteps[2]?.classList.add('completed');
    }, 2400);
    
    // Переход к результатам
    setTimeout(async () => {
        await generateResults();
        goToStep(5);
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
        
        elements.resultsGrid.innerHTML = recommendations.map((rec, idx) => `
            <div class="result-card">
                <div class="result-rank">${idx + 1}</div>
                <div class="result-image">
                    <img src="${rec.product.image_url}" alt="${rec.product.shade}" loading="lazy">
                </div>
                <div class="result-brand">${rec.product.brand}</div>
                <div class="result-line">${rec.product.line}</div>
                <div class="result-shade">${rec.product.shade}</div>
                ${rec.product.price ? `<div class="result-price">${rec.product.price} ₽</div>` : ''}
                <button class="btn-buy" onclick="window.open('${rec.product.product_url || '#'}', '_blank')">Купить</button>
            </div>
        `).join('');
        
        // Сохраняем рекомендации для скачивания
        window.currentRecommendations = recommendations;
    } catch (error) {
        console.error('Ошибка генерации рекомендаций:', error);
        elements.resultsGrid.innerHTML = '<p>Ошибка загрузки рекомендаций. Попробуйте позже.</p>';
    }
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
    
    elements.brandSelect.value = '';
    elements.lineDropdownBtn.disabled = true;
    elements.lineSelectedText.textContent = 'Сначала выбери бренд';
    elements.lineDropdownList.innerHTML = '';
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

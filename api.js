// API клиент для SkinCode backend
const API_BASE_URL = (typeof window !== 'undefined' && window.SKINCODE_API_URL)
    || (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:'
        ? 'http://localhost:8000'
        : '/api');

class SkinCodeAPI {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            // Добавляем timeout 10 секунд
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            if (error.name === 'AbortError') {
                throw new Error('API request timeout (10s)');
            }
            throw error;
        }
    }

    // ===== USER ENDPOINTS =====

    async createUser(anonymousId = null, undertone = null, skinType = null) {
        return this.request('/users/', {
            method: 'POST',
            body: JSON.stringify({
                anonymous_id: anonymousId
            })
        });
    }

    async getUser(userId) {
        return this.request(`/users/${userId}`);
    }

    async updateUser(userId, undertone = null, skinType = null) {
        const params = new URLSearchParams();
        if (undertone) params.append('undertone', undertone);
        if (skinType) params.append('skin_type', skinType);
        
        return this.request(`/users/${userId}?${params.toString()}`, {
            method: 'PATCH'
        });
    }

    async getUserProducts(userId) {
        return this.request(`/users/${userId}/products`);
    }

    async addUserProduct(userId, productId) {
        return this.request(`/users/${userId}/products`, {
            method: 'POST',
            body: JSON.stringify({ product_id: productId })
        });
    }

    async deleteUserProduct(userId, productId) {
        return this.request(`/users/${userId}/products/${productId}`, {
            method: 'DELETE'
        });
    }

    // ===== PRODUCT ENDPOINTS =====

    async getProducts(skip = 0, limit = 100) {
        return this.request(`/products/?skip=${skip}&limit=${limit}`);
    }

    async getProduct(productId) {
        return this.request(`/products/${productId}`);
    }

    async getProductsByBrand(brand) {
        return this.request(`/products/brand/${encodeURIComponent(brand)}`);
    }

    async getProductsByBrandAndLine(brand, line) {
        return this.request(`/products/brand/${encodeURIComponent(brand)}/line/${encodeURIComponent(line)}`);
    }

    async getBrands() {
        return this.request('/brands/');
    }

    async getLinesByBrand(brand) {
        return this.request(`/brands/${encodeURIComponent(brand)}/lines`);
    }

    async searchProducts({ query = null, brand = null, model = null, shade = null, limit = 10 } = {}) {
        return this.request('/products/search', {
            method: 'POST',
            body: JSON.stringify({ query, brand, model, shade, limit })
        });
    }

    // ===== RECOMMENDATION ENDPOINTS =====

    async getRecommendations(userId, undertone = null, skinType = null, productIds = []) {
        return this.request('/recommendations/', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                undertone: undertone,
                skin_type: skinType,
                product_ids: productIds
            })
        });
    }

    async getUserRecommendations(userId) {
        return this.request(`/users/${userId}/recommendations`);
    }
}

// Создаем глобальный экземпляр API
const api = new SkinCodeAPI();

// API клиент для SkinCode backend
function resolveApiBaseUrl() {
    if (typeof window !== 'undefined' && window.SKINCODE_API_URL) {
        return window.SKINCODE_API_URL;
    }
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '') {
            return 'http://127.0.0.1:8000';
        }
        return `${window.location.origin.replace(/\/$/, '')}/api`;
    }
    return 'https://skincode.tech/api';
}

const API_BASE_URL = resolveApiBaseUrl();

class SkinCodeAPI {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type') || '';
            let data = null;
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = text || null;
            }

            if (!response.ok) {
                let detail = response.statusText;
                if (data && typeof data === 'object' && data.detail) {
                    detail = Array.isArray(data.detail)
                        ? data.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
                        : String(data.detail);
                } else if (typeof data === 'string' && data) {
                    detail = data;
                }
                throw new Error(`API ${response.status}: ${detail}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', url, error);
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания ответа API (15 с)');
            }
            if (error.message === 'Failed to fetch') {
                throw new Error(
                    `Нет связи с API (${this.baseUrl}). Запусти backend локально или проверь Railway.`
                );
            }
            throw error;
        }
    }

    async createUser(anonymousId = null, undertone = null, skinType = null) {
        return this.request('/users/', {
            method: 'POST',
            body: JSON.stringify({
                anonymous_id: anonymousId,
                undertone: undertone,
                skin_type: skinType
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

    async searchProducts(query, limit = 10) {
        return this.request('/products/search', {
            method: 'POST',
            body: JSON.stringify({ query, limit })
        });
    }

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

const api = new SkinCodeAPI();
console.log('SkinCode API:', api.baseUrl);

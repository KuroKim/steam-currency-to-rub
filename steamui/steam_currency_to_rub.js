(() => {
    'use strict';

    const HOST = String(location.hostname || '').toLowerCase();
    if (HOST !== 'store.steampowered.com' && HOST !== 'steamcommunity.com') {
        return;
    }

    const CACHE_KEY = 'steam_currency_to_rub_rates_v2';
    const CACHE_TIMEOUT_KEY = 'steam_currency_to_rub_timeout_v2';
    const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

    const signToCurrency = {
        '₸': 'KZT',
        'TL': 'TRY',
        '€': 'EUR',
        '£': 'GBP',
        'ARS$': 'ARS',
        '₴': 'UAH',
        '$': 'USD',
    };

    const steamCurrencies = [
        { id: 1, abbr: 'USD', symbol: '$' },
        { id: 2, abbr: 'GBP', symbol: '£' },
        { id: 3, abbr: 'EUR', symbol: '€' },
        { id: 5, abbr: 'RUB', symbol: 'pуб' },
        { id: 17, abbr: 'TRY', symbol: 'TL' },
        { id: 18, abbr: 'UAH', symbol: '₴' },
        { id: 34, abbr: 'ARS', symbol: 'ARS$' },
        { id: 37, abbr: 'KZT', symbol: '₸' },
    ];

    const SUPPORTED = ['KZT', 'TRY', 'EUR', 'GBP', 'ARS', 'UAH', 'USD'];

    const SELECTORS = [
        '#header_wallet_balance',
        'div[class*=StoreSalePriceBox]',
        '.game_purchase_price',
        '.discount_final_price',
        '.discount_final_price > div:not([class])',
        '.search_price',
        '.price',
        '.match_subtitle',
        '.game_area_dlc_price',
        '.savings.bundle_savings',
        '.wallet_column',
        '.wht_total',
        '.normal_price',
        '.sale_price',
        '.StoreSalePriceWidgetContainer:not(.Discounted) div',
        '.StoreSalePriceWidgetContainer.Discounted div:nth-child(2) > div:nth-child(2)',
        '#marketWalletBalanceAmount',
        '.market_commodity_order_summary > span:nth-child(2)',
        '.market_commodity_orders_table tr > td:first-child',
        '.market_listing_price_with_fee',
        '.market_activity_price',
        '.item_market_actions > div > div:nth-child(2)'
    ].map((x) => `${x}:not([data-steam-rub-done="1"])`).join(', ');

    let sourceCurrency = null;
    let sourceCurrencySign = null;
    let rubRate = null;
    let observerStarted = false;
    let injectScheduled = false;

    function log(...args) {
        console.log('[Steam Currency to RUB]', ...args);
    }

    function findCurrencyById(id) {
        return steamCurrencies.find((item) => item.id === id) || null;
    }

    function addStyles() {
        if (document.getElementById('steam-currency-to-rub-style')) return;

        const style = document.createElement('style');
        style.id = 'steam-currency-to-rub-style';
        style.textContent = `
            .steam-rub-original {
                font-size: 11px;
            }

            .steam-rub-block {
                padding-left: 5px;
                white-space: nowrap;
                opacity: 0.92;
            }

            .steam-rub-inline {
                white-space: nowrap;
                opacity: 0.92;
            }

            .tab_item_discount { width: 160px !important; }
            .tab_item_discount .discount_prices { width: 100% !important; }
            .tab_item_discount .discount_final_price { padding: 0 !important; }
            .home_marketing_message.small .discount_block { height: auto !important; }
            .discount_block_inline { white-space: nowrap !important; }
            .curator #RecommendationsRows .store_capsule.price_inline .discount_block { min-width: 200px !important; }
            .market_listing_their_price { min-width: 130px !important; }
        `;
        document.head.appendChild(style);
    }

    function safeParseJSON(value) {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }

    async function fetchRates() {
        const sources = [
            `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/rub.json?${Math.random()}`,
            `https://latest.currency-api.pages.dev/v1/currencies/rub.json?${Math.random()}`
        ];

        let lastError = null;

        for (const url of sources) {
            try {
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} for ${url}`);
                }

                const data = await response.json();

                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                localStorage.setItem(CACHE_TIMEOUT_KEY, String(Date.now() + CACHE_MS));

                return data;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('Failed to fetch rates');
    }

    async function getRates() {
        const timeout = Number(localStorage.getItem(CACHE_TIMEOUT_KEY) || 0);
        const cache = safeParseJSON(localStorage.getItem(CACHE_KEY));
        const rateDate = cache && cache.date ? Date.parse(cache.date) : 0;

        if (
            !cache ||
            !timeout ||
            timeout <= Date.now() ||
            !rateDate ||
            rateDate + 24 * 60 * 60 * 1000 <= Date.now()
        ) {
            return fetchRates();
        }

        return cache;
    }

    function detectCurrencyFromMeta() {
        const meta = document.querySelector('meta[itemprop="priceCurrency"]');
        if (meta && meta.content) {
            const abbr = String(meta.content).trim().toUpperCase();
            const sign = Object.keys(signToCurrency).find((key) => signToCurrency[key] === abbr) || null;
            return { abbr, sign };
        }
        return null;
    }

    function detectCurrencyFromFormatter() {
        try {
            if (
                typeof GStoreItemData !== 'undefined' &&
                GStoreItemData &&
                typeof GStoreItemData.fnFormatCurrency === 'function'
            ) {
                const formatted = GStoreItemData.fnFormatCurrency(12345);
                const sign = String(formatted)
                    .replace('123,45', '')
                    .replace('123.45', '')
                    .trim();

                const abbr = signToCurrency[sign] || null;
                if (abbr) {
                    return { abbr, sign };
                }
            }
        } catch (error) {
            log('formatter detect failed', error);
        }

        return null;
    }

    function detectCurrencyFromWallet() {
        try {
            if (
                typeof g_rgWalletInfo !== 'undefined' &&
                g_rgWalletInfo &&
                g_rgWalletInfo.wallet_currency != null
            ) {
                const currency = findCurrencyById(Number(g_rgWalletInfo.wallet_currency));
                if (currency) {
                    return {
                        abbr: currency.abbr,
                        sign: currency.symbol
                    };
                }
            }
        } catch (error) {
            log('wallet detect failed', error);
        }

        return null;
    }

    function detectCurrentCurrency() {
        if (sourceCurrency) {
            return { abbr: sourceCurrency, sign: sourceCurrencySign };
        }

        const fromMeta = detectCurrencyFromMeta();
        if (fromMeta) return fromMeta;

        const fromFormatter = detectCurrencyFromFormatter();
        if (fromFormatter) return fromFormatter;

        const fromWallet = detectCurrencyFromWallet();
        if (fromWallet) return fromWallet;

        return null;
    }

    function formatRub(value) {
        return new Intl.NumberFormat('ru-RU', {
            maximumFractionDigits: 0
        }).format(Math.ceil(value)) + ' ₽';
    }

    function textContainsSupportedCurrency(text) {
        if (!text) return false;

        return Object.keys(signToCurrency).some((sign) => text.includes(sign));
    }

    function alreadyConverted(element) {
        const text = element.innerText || element.textContent || '';
        return (
            element.getAttribute('data-steam-rub-done') === '1' ||
            text.includes('≈') && text.includes('₽')
        );
    }

    function shouldSkip(element) {
        if (!(element instanceof HTMLElement)) return true;
        if (alreadyConverted(element)) return true;

        const classList = String(element.className || '');

        if (classList.includes('discount_original_price')) return true;
        if (classList.includes('es-regprice') || classList.includes('es-converted')) return true;
        if (classList.includes('your_price_label')) return true;
        if (classList.includes('spotlight_body') || classList.includes('similar_grid_price')) return true;
        if (classList.includes('market_table_value')) return true;

        const ownText = element.innerText || element.textContent || '';
        const parentText = element.parentElement ? (element.parentElement.innerText || element.parentElement.textContent || '') : '';

        return !textContainsSupportedCurrency(ownText) && !textContainsSupportedCurrency(parentText);
    }

    function parsePrice(element) {
        if (element.dataset && element.dataset.priceFinal) {
            const value = Number(element.dataset.priceFinal) / 100;
            return Number.isFinite(value) && value > 0 ? value : null;
        }

        const clone = element.cloneNode(true);

        // Убираем strike/старую цену, если она внутри
        const strikes = clone.querySelectorAll('strike');
        for (const strike of strikes) {
            strike.remove();
        }

        let text = (clone.innerText || clone.textContent || '')
            .trim()
            .split(/\r?\n|\r|\n/g)[0]
            .replace(/[^0-9.,-]+/g, '');

        if (!text) return null;

        if (sourceCurrency !== 'USD') {
            text = text.replace(/\./g, '').replace(',', '.');
        } else {
            text = text.replace(/,/g, '');
        }

        const value = Number(text);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    function injectPrice(element) {
        if (shouldSkip(element)) return;
        if (!sourceCurrency || !rubRate) return;

        const price = parsePrice(element);
        if (!price) return;

        const converted = formatRub(price / rubRate);
        const convertedHtml = `≈${converted.replace(/ /g, '&nbsp;')}`;

        let inline = false;

        const classList = String(element.className || '');
        if (
            element.id === 'marketWalletBalanceAmount' ||
            classList.includes('market_listing_price_with_fee') ||
            classList.includes('market_activity_price')
        ) {
            inline = true;
        }

        if (
            element.parentElement &&
            element.parentElement.parentElement &&
            String(element.parentElement.parentElement.className || '').includes('item_market_actions')
        ) {
            inline = true;
        }

        if (inline) {
            element.innerHTML = `${element.innerHTML} <span class="steam-rub-inline">(${convertedHtml})</span>`;
        } else {
            const originalText = (element.innerText || element.textContent || '')
                .replace('ARS$ ', '$')
                .trim()
                .replace(/ /g, '&nbsp;');

            element.innerHTML = `
                <span class="steam-rub-original">${originalText}</span>
                <span class="steam-rub-block">${convertedHtml}</span>
            `;
        }

        element.setAttribute('data-steam-rub-done', '1');
    }

    function runInjection(root = document) {
        if (!sourceCurrency || !rubRate) return;

        const prices = root.querySelectorAll(SELECTORS);
        if (!prices || !prices.length) return;

        for (const priceNode of prices) {
            try {
                injectPrice(priceNode);
            } catch (error) {
                log('inject error', error, priceNode);
            }
        }
    }

    function scheduleInjection() {
        if (injectScheduled) return;
        injectScheduled = true;

        requestAnimationFrame(() => {
            injectScheduled = false;
            runInjection(document);
        });
    }

    function startObserver() {
        if (observerStarted || !document.body) return;

        observerStarted = true;

        const observer = new MutationObserver(() => {
            scheduleInjection();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Повторный пинок на лениво дорисованные блоки
        setTimeout(scheduleInjection, 1000);
        setTimeout(scheduleInjection, 2500);
    }

    async function main() {
        try {
            addStyles();

            const rates = await getRates();
            const detected = detectCurrentCurrency();

            sourceCurrency = detected ? detected.abbr : null;
            sourceCurrencySign = detected ? detected.sign : null;

            log('detected currency:', sourceCurrency, 'sign:', sourceCurrencySign);

            if (!sourceCurrency) {
                throw new Error('No source currency detected');
            }

            if (sourceCurrency === 'RUB') {
                log('Already RUB, nothing to do');
                return;
            }

            if (SUPPORTED.indexOf(sourceCurrency) === -1) {
                log('Unsupported source currency:', sourceCurrency);
                return;
            }

            const rawRate = rates && rates.rub ? rates.rub[sourceCurrency.toLowerCase()] : null;
            if (!rawRate || !Number.isFinite(rawRate)) {
                throw new Error(`Rate not found for ${sourceCurrency}`);
            }

            rubRate = Math.round(rawRate * 100) / 100;
            log('effective rate:', rubRate);

            runInjection(document);
            startObserver();
        } catch (error) {
            log('fatal error', error);
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', main, { once: true });
    } else {
        main();
    }
})();
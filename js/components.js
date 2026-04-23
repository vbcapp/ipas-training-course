/**
 * components.js — 全域 Header 與 Bottom Nav 自動注入
 *
 * 使用方式：
 * 1. 在 HTML <head> 末尾加入 <script src="js/components.js"></script>
 * 2. 在 body 最前面放 placeholder：
 *      <div id="app-header" data-variant="brand" data-title="考試神器"></div>
 *    或
 *      <div id="app-header" data-variant="back" data-title="權限管理" data-back-href="profile.html"></div>
 *
 * 3. Bottom Nav 維持原本的用法：
 *      <div id="bottom-nav" data-active-page="index"></div>
 *
 * Header Variants:
 *   - "brand"  ：品牌 Logo + 標題 + admin 按鈕（首頁）
 *   - "back"   ：返回箭頭 + 標題（子頁面，金色背景）
 *   - "back-white" ：返回箭頭 + 標題（白色背景，如 rule.html）
 */

const AppHeader = {
    /**
     * 初始化 Header
     */
    init() {
        const container = document.getElementById('app-header');
        if (!container) return;

        const variant = container.getAttribute('data-variant') || 'brand';
        // brand variant 使用 OrgBranding 動態組織名稱，back variant 使用 data-title（頁面專屬標題）
        let title = container.getAttribute('data-title') || '';
        if (variant === 'brand' && typeof OrgBranding !== 'undefined' && OrgBranding.orgName) {
            title = OrgBranding.orgName;
        }
        const backHref = container.getAttribute('data-back-href') || 'index.html';
        const adminBtn = container.getAttribute('data-admin-btn') === 'true';

        container.innerHTML = this.render(variant, title, backHref, adminBtn);
    },

    /**
     * 渲染 Header HTML
     */
    render(variant, title, backHref, adminBtn) {
        switch (variant) {
            case 'brand':
                return this.renderBrand(title, adminBtn);
            case 'back':
                return this.renderBack(title, backHref, 'primary');
            case 'back-white':
                return this.renderBack(title, backHref, 'white');
            default:
                return this.renderBrand(title, adminBtn);
        }
    },

    /**
     * 品牌型 Header（首頁）
     */
    renderBrand(title, showAdminBtn) {
        const adminBtnHtml = showAdminBtn
            ? `<button id="admin-create-btn" onclick="window.location.href='create.html'" class="vibe-icon-btn hidden">
                <span class="material-symbols-outlined text-black font-bold">add</span>
               </button>`
            : '';

        return `
            <header class="flex-none bg-surface dark:bg-background-dark border-b-2 border-border-main px-4 py-4 flex items-center justify-between z-10">
                <div class="flex items-center gap-2">
                    <a href="https://ipaslearningcard.zeabur.app/index.html" title="切換到單字卡"
                        class="bg-primary neo-border p-1 flex items-center justify-center hover:bg-yellow-300 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer">
                        <span class="material-symbols-outlined text-black font-bold">terminal</span>
                    </a>
                    <h1 class="text-xl font-black tracking-tighter">${title}</h1>
                </div>
                ${adminBtnHtml}
            </header>
        `;
    },

    /**
     * 返回型 Header（子頁面：admin, create, import 等）
     */
    renderBack(title, backHref, bgColor) {
        const bgClass = bgColor === 'white'
            ? 'bg-white border-b-8 border-black'
            : 'bg-primary border-b-4 border-black';

        return `
            <header class="${bgClass} pt-12 pb-6 px-6 sticky top-0 z-40">
                <div class="flex items-center gap-4">
                    <button onclick="window.location.href='${backHref}'"
                        class="vibe-icon-btn bg-white" style="width:auto;height:auto;border-width:4px">
                        <span class="material-symbols-outlined text-black block">arrow_back</span>
                    </button>
                    <h1 class="text-2xl font-black italic tracking-tight">${title}</h1>
                </div>
            </header>
        `;
    }
};

// ── 自動初始化 ──────────────────────────────────────────────
// 若 DOM 已 ready（script 被 defer / 後插入等情況），直接同步 init，
// 避免再等一個 DOMContentLoaded tick 造成 header 晚一幀注入。
function _initAppHeaderWhenReady() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AppHeader.init(), { once: true });
    } else {
        AppHeader.init();
    }
}
_initAppHeaderWhenReady();

// ── Material Symbols 字體載入偵測 ─────────────────────────
// 字體還沒到之前，vibe-style.css 會把 .material-symbols-outlined
// 設成 visibility: hidden，避免使用者看到 "arrow_back" 之類 raw 文字。
// 這裡在字體真的 ready（或逾時）後，把 .msymbol-ready 加到 <html>
// 恢復顯示。逾時是安全網，防止字體載入失敗時 icon 永遠隱藏。
(function waitForMaterialSymbols() {
    const markReady = () => document.documentElement.classList.add('msymbol-ready');

    // 安全網：3.5s 後無論如何都放開顯示（fallback 文字雖不美但至少可用）
    const safety = setTimeout(markReady, 3500);

    if (document.fonts && typeof document.fonts.load === 'function') {
        document.fonts.load('24px "Material Symbols Outlined"')
            .then(() => { clearTimeout(safety); markReady(); })
            .catch(() => { clearTimeout(safety); markReady(); });
    } else {
        // 老瀏覽器：load 事件之後就放行
        window.addEventListener('load', () => { clearTimeout(safety); markReady(); }, { once: true });
    }
})();

// ── 預取常用子頁，換頁時 HTML 已在快取、感覺秒開 ────────────
// 只在 idle 時預取，不搶主線程；Service Worker 會幫忙二次快取。
(function prefetchSiblingPages() {
    const run = () => {
        const candidates = [
            'index.html',
            'weakness.html',
            'rank.html',
            'profile.html'
        ];
        const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        candidates.forEach(href => {
            if (href.toLowerCase() === current) return;
            // 避免重複插入
            if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = href;
            document.head.appendChild(link);
        });
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 3000 });
    } else {
        // Safari fallback：page load 後 1 秒再做
        window.addEventListener('load', () => setTimeout(run, 1000), { once: true });
    }
})();

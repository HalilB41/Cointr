// ====== GLOBAL ======
let favorites = [];
let currentUserEmail = "";
let showingFavorites = false;

// === CoinGecko API/Anahtar Kodları SİLİNDİ ===
// === Manuel Logo Map KALDI ===
const manualLogoMap = {
    "TURTLEUSDT": "https://assets.coingecko.com/coins/images/69595/standard/OUDzqTkE_400x400.png?1759166194",
    "C98USDT": "https://assets.coingecko.com/coins/images/17117/standard/logo.png?1696516677",
    "MASKUSDT": "https://assets.coingecko.com/coins/images/14051/standard/Mask_Network.jpg?1696513776"
    // Diğer manuel logolar buraya eklenebilir (sonuncuda virgül yok)
};

// ===========================================
// ====== FİYAT FORMATLAMA FONKSİYONU ======
// ===========================================
function formatPrice(price) {
    if (price == null || isNaN(price)) { return "-"; }
    if (price < 0.001 && price > 0) { return price.toFixed(8); }
    if (price < 1 && price > 0) { return price.toFixed(4); }
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===========================================
// ====== LOGO FONKSİYONLARI ======
// ===========================================
function getBaseSymbol(symbol) {
    let base = symbol;
    const quotes = ["USDT", "BUSD", "USDC", "TUSD", "FDUSD", "ETH", "BTC"];
    for (const quote of quotes) { if (base.endsWith(quote) && base.length > quote.length) { base = base.substring(0, base.length - quote.length); break; } }
    const prefixes = ["1000000", "100000", "1000", "100"];
    for (const prefix of prefixes) { if (base.startsWith(prefix)) { base = base.substring(prefix.length); break; } }
    if (symbol === "1000LUNCUSDT") return "lunc";
    if (symbol === "LUNA2USDT") return "luna"; 
    if (symbol === "BTCDOMUSDT") return "btc";
    if (symbol === "1000PEPEUSDT") return "pepe";
    if (symbol === "1000FLOKIUSDT") return "floki";
    if (symbol === "1000XECUSDT") return "xec";
    if (symbol === "1000SHIBUSDT") return "shib";
    if (symbol === "1000SATSUSDT") return "sats";
    if (symbol === "1000RATSUSDT") return "rats";
    if (symbol === "1000BONKUSDT") return "bonk";
    return base.toLowerCase();
}

function getLogoUrl(symbol) {
    const baseSymbol = getBaseSymbol(symbol);
    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/${baseSymbol}.svg`;
}

// ===========================================
// ====== 🕒 YENİ: SENKRONİZE YENİLEME SİSTEMİ ======
// ===========================================
function setupSyncRefresh() {
    const now = new Date();
    const mins = now.getMinutes();
    const secs = now.getSeconds();

    // Bir sonraki :00, :15, :30, :45. dakikaya kalan süreyi hesapla
    const nextInterval = 15 - (mins % 15);
    const msToWait = (nextInterval * 60 - secs) * 1000;

    console.log(`⏱️ Senkronizasyon: ${nextInterval} dakika sonra otomatik yenilenecek.`);

    setTimeout(() => {
        loadCoinData(); 
        setInterval(loadCoinData, 15 * 60 * 1000); 
    }, msToWait);
}

// ====== COİN VERİLERİNİ YÜKLEME ======
document.addEventListener("DOMContentLoaded", () => {
    loadCoinData();
    setupSyncRefresh(); // Senkronizasyon burada başlatılıyor
    
    // Manuel Yenileme Butonu (ID: analyze-btn olarak düzeltildi)
    const analyzeBtn = document.getElementById("analyze-btn");
    if (analyzeBtn) {
        analyzeBtn.addEventListener("click", () => {
            analyzeBtn.textContent = "⏳ Analiz Ediliyor...";
            analyzeBtn.disabled = true;
            loadCoinData().then(() => {
                setTimeout(() => {
                    analyzeBtn.textContent = "🔄 Analizi Güncelle";
                    analyzeBtn.disabled = false;
                }, 1000);
            });
        });
    }
});

async function loadCoinData() {
    const tbody = document.querySelector("#coinTable tbody");
    if (tbody && tbody.innerHTML.trim() === "") {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#aaa;">⏳ Analiz verileri yükleniyor...</td></tr>`;
    }

    try {
        // Cache kırmak için t parametresi eklendi
        const url = `${window.location.origin}/data.json?t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`data.json bulunamadı!`);
        const analysisData = await response.json();

        tbody.innerHTML = ""; 
        if (!analysisData.coins || analysisData.coins.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#888;">Analiz verisi bulunamadı.</td></tr>`;
            return;
        }

        analysisData.coins.forEach((c) => {
            const row = document.createElement("tr");
            const tradingViewSymbol = `BINANCE:${c.symbol}`;
            const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tradingViewSymbol)}`;
            const positionColor = c.position === "Long" ? "limegreen" : c.position === "Short" ? "red" : "gray";
            const isFav = favorites.includes(c.symbol);
            const star = isFav ? "⭐" : "☆";

            let logoUrl = manualLogoMap[c.symbol] || getLogoUrl(c.symbol);
            const logoImgTag = `<img src="${logoUrl}" class="coin-logo" alt="" onerror="this.style.display='none'">`;

            row.innerHTML = `
                <td class="fav-cell" style="cursor:pointer">${star}</td>
                <td>
                    <div class="coin-cell-content">
                        ${logoImgTag}
                        <span class="coin-symbol" style="cursor:pointer; text-decoration:underline; color:#79c0ff">${c.symbol}</span>
                    </div>
                </td>
                <td class="price-cell">${formatPrice(c.price)}</td>
                <td>${c.rsi ?? "-"}</td>
                <td>${c.price_change?.toFixed(2) ?? "-"}%</td>
                <td>${c.volume_change?.toFixed(2) ?? "-"}%</td>
                <td>${c.score?.toFixed(2) ?? "-"}</td>
                <td style="color:${positionColor}; font-weight:bold;">${c.position}</td>
            `;

            tbody.appendChild(row);

            row.querySelector(".fav-cell").addEventListener("click", (event) => {
                event.stopPropagation();
                if (favorites.includes(c.symbol)) {
                    removeFavorite(c.symbol, event.target);
                } else {
                    toggleFavorite(c.symbol, event.target);
                }
            });

            row.querySelector(".coin-symbol").addEventListener('click', (event) => {
                event.stopPropagation();
                window.open(tradingViewUrl, '_blank');
            });
        });

        let updateText = document.querySelector("#lastUpdate");
        const container = document.querySelector(".container");
        if (!updateText && container) {
            updateText = document.createElement("p");
            updateText.id = "lastUpdate";
            updateText.style.textAlign = "center";
            updateText.style.color = "#00ffa2";
            updateText.style.marginTop = "10px";
            container.appendChild(updateText);
        }

        if (updateText) {
            updateText.textContent = `🕒 Analiz Zamanı: ${analysisData.last_update || "Bilinmiyor"}`;
        }

    } catch (error) {
        console.error("❌ Hata:", error);
        if(tbody) tbody.innerHTML = `<tr><td colspan="8" style="color:red;text-align:center;">Hata: ${error.message}</td></tr>`;
    }
}

// ====== FAVORİ YÖNETİMİ ======
function toggleFavorite(symbol, el) {
    if (currentUserEmail) {
        favorites.push(symbol);
        saveFavorites();
        el.textContent = "⭐";
    } else {
        alert("⚠️ Favori eklemek için lütfen önce giriş yapın!");
    }
}

function removeFavorite(symbol, el) {
    favorites = favorites.filter((fav) => fav !== symbol);
    saveFavorites();
    el.textContent = "☆";
    if (showingFavorites) {
        const row = el.closest("tr");
        if (row) row.style.display = "none";
    }
}

function saveFavorites() {
    if (currentUserEmail && favorites.length > 0) {
        localStorage.setItem(`favorites_${currentUserEmail}`, JSON.stringify(favorites));
    } else if (currentUserEmail) {
        localStorage.removeItem(`favorites_${currentUserEmail}`);
    }
}

function loadFavorites() {
    if (currentUserEmail) {
        const savedFavorites = localStorage.getItem(`favorites_${currentUserEmail}`);
        favorites = savedFavorites ? JSON.parse(savedFavorites) : [];
    } else {
        favorites = [];
    }
}

// ====== ARAMA ÖZELLİĞİ ======
const searchInput = document.getElementById("coinSearch");
const searchInfo = document.getElementById("searchInfo");

if (searchInput) {
    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toUpperCase().trim();
        const rows = document.querySelectorAll("#coinTable tbody tr");
        rows.forEach(row => {
            const symEl = row.querySelector(".coin-symbol");
            if (!symEl) return;
            const coinSymbol = symEl.textContent.toUpperCase();
            const matchesSearch = coinSymbol.includes(searchTerm);
            const isFav = row.querySelector(".fav-cell").textContent.includes("⭐");

            let shouldShow = showingFavorites ? (isFav && matchesSearch) : matchesSearch;
            row.style.display = shouldShow ? "" : "none";
        });
    });
}

// ====== DROPDOWN FAVORİLER ======
const favBtn = document.getElementById("menu-favorites");
if (favBtn) {
    favBtn.addEventListener("click", () => {
        showingFavorites = !showingFavorites;
        favBtn.textContent = showingFavorites ? "📊 Panel" : "⭐ Favoriler";
        const searchTerm = searchInput ? searchInput.value.toUpperCase().trim() : "";
        const rows = document.querySelectorAll("#coinTable tbody tr");
        let favoriteCount = 0;
        let visibleCount = 0;

        rows.forEach((row) => {
            const favCell = row.querySelector(".fav-cell");
            const symEl = row.querySelector(".coin-symbol");
            if (!favCell || !symEl) return;

            const isFav = favCell.textContent.includes("⭐");
            if (isFav) favoriteCount++;
            const matchesSearch = symEl.textContent.toUpperCase().includes(searchTerm);

            let shouldShow = showingFavorites ? (isFav && matchesSearch) : matchesSearch;
            row.style.display = shouldShow ? "" : "none";
            if (shouldShow) visibleCount++;
        });

        if (searchInfo) {
            searchInfo.textContent = showingFavorites ? `Favori modunda: ${visibleCount} / ${favoriteCount} favori coin.` : "";
        }
    });
}

// ====== FIREBASE KULLANICI TAKİBİ ======
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
const auth = getAuth();

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        loadFavorites();
        setTimeout(updateFavoriteStarsUI, 500);
    } else {
        favorites = [];
        currentUserEmail = "";
        showingFavorites = false;
        if (searchInput) searchInput.value = "";
        updateFavoriteStarsUI();
        loadCoinData();
    }
});

function updateFavoriteStarsUI() {
    const rows = document.querySelectorAll("#coinTable tbody tr");
    rows.forEach(row => {
        const symbolElement = row.querySelector(".coin-symbol");
        const favCellElement = row.querySelector(".fav-cell");
        if (symbolElement && favCellElement) {
            const isFav = favorites.includes(symbolElement.textContent.trim());
            favCellElement.textContent = isFav ? "⭐" : "☆";
        }
    });
}
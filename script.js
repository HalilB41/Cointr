import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, setDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// FİREBASE CONFIG (Senin Bilgilerin)
const firebaseConfig = {
  apiKey: "AIzaSyBOVsspc3AZhXiKWB-kSrkbQWMEcArCuFI",
  authDomain: "cointr-4ec4f.firebaseapp.com",
  projectId: "cointr-4ec4f",
  storageBucket: "cointr-4ec4f.firebasestorage.app",
  messagingSenderId: "285464001882",
  appId: "1:285464001882:web:110efe7a57fa555939c763",
  measurementId: "G-05EFBX38L4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentUsername = "";
let marketDataCache = [];
let currentTab = "crypto"; // 'crypto' veya 'bist'

// BIST için Örnek/Demo Veriler (Gerçek veri için Backend API gereklidir)
const bistDemoData = [
    { symbol: "THYAO", price: 310.50, price_change: 2.15, volume: 150000000 },
    { symbol: "ASELS", price: 62.40, price_change: -0.80, volume: 85000000 },
    { symbol: "TUPRS", price: 104.20, price_change: 1.05, volume: 92000000 },
    { symbol: "EREGL", price: 185.00, price_change: -1.20, volume: 64000000 },
    { symbol: "GARAN", price: 74.15, price_change: 0.50, volume: 110000000 }
];

// ==========================================
// 0. HATA TÜRKÇELEŞTİRİCİ
// ==========================================
function translateAuthError(code) {
    switch (code) {
        case 'auth/email-already-in-use': return 'Bu e-posta adresi zaten kullanılıyor.';
        case 'auth/weak-password': return 'Şifre çok zayıf! En az 6 karakter olmalı.';
        case 'auth/invalid-email': return 'Geçersiz e-posta formatı!';
        case 'auth/user-not-found': return 'Kullanıcı bulunamadı.';
        case 'auth/wrong-password': return 'Şifre hatalı!';
        case 'auth/invalid-credential': return 'Giriş bilgileri hatalı veya geçersiz.';
        default: return 'Bir hata oluştu: ' + code;
    }
}

// ==========================================
// 1. SPA SAYFA YÖNETİMİ
// ==========================================
const homeSection = document.getElementById("home-section");
const editProfileSection = document.getElementById("edit-profile-section");
const authPageSection = document.getElementById("auth-page-section");

function showSection(section) {
    homeSection.classList.add("hidden"); editProfileSection.classList.add("hidden"); authPageSection.classList.add("hidden");
    section.classList.remove("hidden");
}

document.getElementById("nav-logo").addEventListener("click", () => showSection(homeSection));
document.getElementById("menu-home").addEventListener("click", () => { showSection(homeSection); document.getElementById("dropdown-menu").classList.add("hidden"); });
document.getElementById("menu-profile-edit").addEventListener("click", () => { showSection(editProfileSection); document.getElementById("dropdown-menu").classList.add("hidden"); });
document.getElementById("nav-login").addEventListener("click", () => showSection(authPageSection));

// ==========================================
// 2. GİRİŞ VE BENZERSİZ İSİMLİ KAYIT İŞLEMLERİ
// ==========================================
const loginBox = document.getElementById("login-box");
const registerBox = document.getElementById("register-box");

document.getElementById("toggle-to-register").addEventListener("click", (e) => { e.preventDefault(); loginBox.classList.add("hidden"); registerBox.classList.remove("hidden"); });
document.getElementById("toggle-to-login").addEventListener("click", (e) => { e.preventDefault(); registerBox.classList.add("hidden"); loginBox.classList.remove("hidden"); });

// Giriş Yap
document.getElementById("btn-login-submit").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if(!email || !password) return alert("E-posta ve şifre girin!");
    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById("login-password").value = "";
        showSection(homeSection);
    } catch (err) { alert("❌ Hata: " + translateAuthError(err.code)); }
});

// Kayıt Ol (Eşsiz İsim Kontrolü)
document.getElementById("btn-register-submit").addEventListener("click", async () => {
    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    
    if(!username || !email || !password) return alert("Tüm alanları doldurun!");

    try {
        // İsim kullanılıyor mu kontrolü
        const q = query(collection(db, "users"), where("username", "==", username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            return alert("❌ Bu kullanıcı adı zaten alınmış! Lütfen başka bir isim seçin.");
        }

        // Kullanılmıyorsa kayıt et
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCred.user.uid), { username, email, bio: "Merhaba!", portfolio: [] });
        document.getElementById("reg-password").value = "";
        showSection(homeSection);
    } catch (err) { alert("❌ Hata: " + translateAuthError(err.code)); }
});

// ==========================================
// 3. KULLANICI DURUM KONTROLÜ
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        currentUsername = userDoc.exists() ? userDoc.data().username : "Kullanıcı";
        
        document.getElementById("nav-login").classList.add("hidden");
        document.getElementById("user-menu").classList.remove("hidden");
        document.getElementById("username-display").textContent = currentUsername;
        if (user.email === "admin@gmail.com") document.getElementById("admin-panel-btn").classList.remove("hidden");

        document.getElementById("portfolio-form").classList.remove("hidden");
        document.getElementById("guest-portfolio-msg").classList.add("hidden");
        document.getElementById("chat-input").disabled = false;
        document.getElementById("chat-send").disabled = false;
        document.getElementById("chat-input").placeholder = "Mesajınızı yazın...";

        document.getElementById("profile-email").value = user.email;
        document.getElementById("profile-username").value = currentUsername;
        document.getElementById("profile-bio").value = userDoc.exists() ? (userDoc.data().bio || "") : "";
        
        renderPortfolio();
    } else {
        currentUser = null;
        document.getElementById("nav-login").classList.remove("hidden");
        document.getElementById("user-menu").classList.add("hidden");
        document.getElementById("portfolio-form").classList.add("hidden");
        document.getElementById("guest-portfolio-msg").classList.remove("hidden");
        document.getElementById("chat-input").disabled = true;
        document.getElementById("chat-send").disabled = true;
        document.getElementById("chat-input").placeholder = "Sohbet etmek için giriş yapın...";
        document.getElementById("portfolio-body").innerHTML = "";
        document.getElementById("total-pnl").textContent = "0.00$";
    }
});

document.getElementById("username-display").addEventListener("click", () => document.getElementById("dropdown-menu").classList.toggle("hidden"));
document.getElementById("menu-logout").addEventListener("click", () => signOut(auth));

// ==========================================
// 4. PİYASA VERİLERİ (CMC Tarzı Tablo & BIST)
// ==========================================
async function fetchMarketData() {
    try {
        // Binance API (Spot) - CORS sorunu daha azdır
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        if (!res.ok) throw new Error("API hatası");
        const rawData = await res.json();
        
        marketDataCache = rawData
            .filter(item => item.symbol.endsWith("USDT"))
            .map(item => ({
                symbol: item.symbol,
                price: parseFloat(item.lastPrice),
                price_change: parseFloat(item.priceChangePercent).toFixed(2),
                volume: parseFloat(item.quoteVolume)
            }))
            .sort((a, b) => b.volume - a.volume);
            
        renderMarket();
        if(currentUser) renderPortfolio();
    } catch (e) { console.error("Piyasa verisi çekilemedi", e); }
}

function renderMarket() {
    const list = document.getElementById("market-list");
    if (!list) return;
    const searchTerm = document.getElementById("market-search").value.toUpperCase();
    list.innerHTML = "";
    
    // Tab seçimine göre datayı belirle
    let dataToRender = currentTab === "crypto" ? marketDataCache : bistDemoData;

    dataToRender.filter(c => c.symbol.includes(searchTerm)).slice(0, 50).forEach((asset, index) => {
        const pChange = parseFloat(asset.price_change);
        const colorClass = pChange >= 0 ? "text-green" : "text-red";
        const arrow = pChange >= 0 ? "▲" : "▼";
        const formattedPrice = asset.price < 1 ? asset.price.toFixed(5) : asset.price.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const currency = currentTab === "crypto" ? "$" : "₺";

        list.innerHTML += `
        <tr>
            <td class="text-muted">${index + 1}</td>
            <td style="text-align: left;" class="symbol-name">${asset.symbol}</td>
            <td style="font-weight: bold;">${currency}${formattedPrice}</td>
            <td class="${colorClass}">${arrow} ${Math.abs(pChange)}%</td>
            <td class="text-muted">${currency}${(asset.volume / 1000000).toFixed(1)}M</td>
            <td><button class="btn-success" style="padding: 5px 10px; font-size: 0.8rem;" onclick="document.getElementById('asset-name').value='${asset.symbol}'">Al</button></td>
        </tr>`;
    });
}
document.getElementById("market-search").addEventListener("input", renderMarket);

document.getElementById("tab-crypto").addEventListener("click", (e) => {
    currentTab = "crypto";
    document.getElementById("tab-crypto").classList.add("active");
    document.getElementById("tab-bist").classList.remove("active");
    renderMarket();
});

document.getElementById("tab-bist").addEventListener("click", (e) => {
    currentTab = "bist";
    document.getElementById("tab-bist").classList.add("active");
    document.getElementById("tab-crypto").classList.remove("active");
    renderMarket();
});

// ==========================================
// 5. PORTFÖY YÖNETİMİ
// ==========================================
document.getElementById("add-asset-btn").addEventListener("click", async () => {
    const symbol = document.getElementById("asset-name").value.toUpperCase();
    const amount = parseFloat(document.getElementById("asset-amount").value);
    const buyPrice = parseFloat(document.getElementById("asset-buy-price").value);
    if(!symbol || !amount || !buyPrice) return alert("Tüm alanları doldurun.");

    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);
    let portfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
    
    portfolio.push({ symbol, amount, buyPrice });
    await setDoc(userRef, { portfolio }, { merge: true });
    
    document.getElementById("asset-name").value = ""; document.getElementById("asset-amount").value = ""; document.getElementById("asset-buy-price").value = "";
    renderPortfolio();
});

async function renderPortfolio() {
    if(!currentUser) return;
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const portfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
    const tbody = document.getElementById("portfolio-body");
    tbody.innerHTML = ""; let totalPnL = 0;

    portfolio.forEach(p => {
        // Önce kriptoda ara, bulamazsa BIST demosunda ara
        let marketData = marketDataCache.find(m => m.symbol === p.symbol) || bistDemoData.find(m => m.symbol === p.symbol);
        const currentPrice = marketData ? marketData.price : p.buyPrice;
        const pnl = (p.amount * currentPrice) - (p.amount * p.buyPrice);
        totalPnL += pnl;

        const colorClass = pnl >= 0 ? "text-green" : "text-red";
        tbody.innerHTML += `<tr><td style="text-align:left;">${p.symbol}</td><td>${p.amount}</td><td>${p.buyPrice}</td><td>${currentPrice.toFixed(4)}</td><td class="${colorClass}">${pnl.toFixed(2)}</td></tr>`;
    });
    
    const totalEl = document.getElementById("total-pnl");
    totalEl.textContent = totalPnL.toFixed(2);
    totalEl.className = totalPnL >= 0 ? "text-green" : "text-red";
}

// ==========================================
// 6. UÇAN SOHBET (FLOATING CHAT) VE MODAL
// ==========================================
const chatBtn = document.getElementById("floating-chat-btn");
const chatBoxWindow = document.getElementById("floating-chat-box");
const closeChat = document.getElementById("close-chat");

chatBtn.addEventListener("click", () => {
    chatBoxWindow.classList.remove("hidden");
    chatBtn.classList.add("hidden");
});
closeChat.addEventListener("click", () => {
    chatBoxWindow.classList.add("hidden");
    chatBtn.classList.remove("hidden");
});

const chatMessages = document.getElementById("chat-messages");
if (chatMessages) {
    onSnapshot(query(collection(db, "chat"), orderBy("timestamp", "asc")), (snapshot) => {
        chatMessages.innerHTML = "";
        snapshot.forEach((doc) => {
            const msg = doc.data();
            const msgDiv = document.createElement("div");
            msgDiv.className = "chat-message";
            
            const nameSpan = document.createElement("span");
            nameSpan.className = "chat-username";
            nameSpan.textContent = msg.username + ": "; 
            nameSpan.onclick = () => showUserProfile(msg.uid);
            
            const textSpan = document.createElement("span");
            textSpan.textContent = msg.text; 

            msgDiv.appendChild(nameSpan); msgDiv.appendChild(textSpan);
            chatMessages.appendChild(msgDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    document.getElementById("chat-send").addEventListener("click", async () => {
        const input = document.getElementById("chat-input");
        if (input.value.trim() !== "" && currentUser) {
            await addDoc(collection(db, "chat"), { uid: currentUser.uid, username: currentUsername, text: input.value.trim(), timestamp: new Date() });
            input.value = "";
        }
    });
    document.getElementById("chat-input").addEventListener("keypress", (e) => { if (e.key === 'Enter') document.getElementById("chat-send").click(); });
}

window.showUserProfile = async function(uid) {
    const modal = document.getElementById("profile-modal");
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
        const data = userDoc.data();
        document.getElementById("modal-username").textContent = data.username;
        document.getElementById("modal-bio").textContent = data.bio || "Biyografi yok.";
        
        const ul = document.getElementById("modal-portfolio-list");
        ul.innerHTML = "";
        if(data.portfolio && data.portfolio.length > 0) {
            data.portfolio.forEach(p => {
                const li = document.createElement("li");
                li.textContent = `${p.amount} Adet ${p.symbol} (Alış: ${p.buyPrice})`;
                ul.appendChild(li);
            });
        } else { ul.innerHTML = "<li class='text-muted'>Henüz portföy eklememiş.</li>"; }
        modal.classList.remove("hidden");
    }
}
document.querySelector(".close-modal").addEventListener("click", () => document.getElementById("profile-modal").classList.add("hidden"));

setInterval(fetchMarketData, 60000);
fetchMarketData();
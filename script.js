import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

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

// ==========================================
// 1. SPA SAYFA YÖNETİMİ (Bölüm Değiştiriciler)
// ==========================================
const homeSection = document.getElementById("home-section");
const editProfileSection = document.getElementById("edit-profile-section");
const authPageSection = document.getElementById("auth-page-section");

function showSection(section) {
    homeSection.classList.add("hidden");
    editProfileSection.classList.add("hidden");
    authPageSection.classList.add("hidden");
    section.classList.remove("hidden");
}

document.getElementById("nav-logo").addEventListener("click", () => showSection(homeSection));
document.getElementById("menu-home").addEventListener("click", () => { showSection(homeSection); document.getElementById("dropdown-menu").classList.add("hidden"); });
document.getElementById("menu-profile-edit").addEventListener("click", () => { showSection(editProfileSection); document.getElementById("dropdown-menu").classList.add("hidden"); });
document.getElementById("nav-login").addEventListener("click", () => showSection(authPageSection));

// ==========================================
// 2. GİRİŞ VE KAYIT İŞLEMLERİ
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
        showSection(homeSection); // Başarılı girişte ana sayfaya dön
    } catch (err) { alert("❌ Hata: Bilgilerinizi kontrol edin."); }
});

// Kayıt Ol
document.getElementById("btn-register-submit").addEventListener("click", async () => {
    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    if(!username || !email || !password) return alert("Tüm alanları doldurun!");
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCred.user.uid), { username, email, bio: "Merhaba!", portfolio: [] });
        document.getElementById("reg-password").value = "";
        showSection(homeSection);
    } catch (err) { alert("❌ Hata: " + err.message); }
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

        // İzinler
        document.getElementById("portfolio-form").classList.remove("hidden");
        document.getElementById("guest-portfolio-msg").classList.add("hidden");
        document.getElementById("chat-input").disabled = false;
        document.getElementById("chat-send").disabled = false;
        document.getElementById("chat-input").placeholder = "Mesajınızı yazın...";

        // Form Doldurma
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
// 4. PİYASA VERİLERİ (data.json)
// ==========================================
async function fetchMarketData() {
    try {
        const res = await fetch(`${window.location.origin}/data.json?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        marketDataCache = data.assets || data.coins; 
        renderMarket();
        if(currentUser) renderPortfolio();
    } catch (e) { console.error("Veri çekilemedi", e); }
}

function renderMarket() {
    const list = document.getElementById("market-list");
    if (!list) return;
    const searchTerm = document.getElementById("market-search")?.value.toUpperCase() || "";
    list.innerHTML = "";
    
    marketDataCache.filter(c => c.symbol.includes(searchTerm)).slice(0, 50).forEach(asset => {
        const color = asset.price_change >= 0 ? "var(--profit-green)" : "var(--loss-red)";
        list.innerHTML += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #334155; padding:10px 0;">
            <b>${asset.symbol}</b> <span style="color:${color}">${asset.price} (${asset.price_change}%)</span>
        </div>`;
    });
}
document.getElementById("market-search")?.addEventListener("input", renderMarket);

// ==========================================
// 5. PROFİL GÜNCELLEME
// ==========================================
document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            username: document.getElementById("profile-username").value.trim(),
            bio: document.getElementById("profile-bio").value.trim()
        }, { merge: true });
        alert("✅ Profil güncellendi!");
        showSection(homeSection);
    } catch (err) { alert("Hata: " + err.message); }
});

document.getElementById("password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass = document.getElementById("new-password").value;
    if(pass.length < 6) return alert("Şifre en az 6 karakter olmalı!");
    try {
        await updatePassword(currentUser, pass);
        alert("✅ Şifre güncellendi!");
        document.getElementById("new-password").value = "";
    } catch (err) { alert("Hata: " + err.message); }
});

// ==========================================
// 6. PORTFÖY YÖNETİMİ
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
    
    document.getElementById("asset-name").value = "";
    document.getElementById("asset-amount").value = "";
    document.getElementById("asset-buy-price").value = "";
    renderPortfolio();
});

async function renderPortfolio() {
    if(!currentUser) return;
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const portfolio = userDoc.exists() ? (userDoc.data().portfolio || []) : [];
    const tbody = document.getElementById("portfolio-body");
    tbody.innerHTML = "";
    let totalPnL = 0;

    portfolio.forEach(p => {
        const marketData = marketDataCache.find(m => m.symbol === p.symbol);
        const currentPrice = marketData ? marketData.price : p.buyPrice;
        const pnl = (p.amount * currentPrice) - (p.amount * p.buyPrice);
        totalPnL += pnl;

        const color = pnl >= 0 ? "var(--profit-green)" : "var(--loss-red)";
        tbody.innerHTML += `<tr><td>${p.symbol}</td><td>${p.amount}</td><td>${p.buyPrice}$</td><td>${currentPrice}$</td><td style="color:${color}">${pnl.toFixed(2)}$</td></tr>`;
    });
    
    const totalEl = document.getElementById("total-pnl");
    totalEl.textContent = totalPnL.toFixed(2) + "$";
    totalEl.style.color = totalPnL >= 0 ? "var(--profit-green)" : "var(--loss-red)";
}

// ==========================================
// 7. SOHBET VE MODAL
// ==========================================
const chatBox = document.getElementById("chat-box");
if (chatBox) {
    onSnapshot(query(collection(db, "chat"), orderBy("timestamp", "asc")), (snapshot) => {
        chatBox.innerHTML = "";
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

            msgDiv.appendChild(nameSpan);
            msgDiv.appendChild(textSpan);
            chatBox.appendChild(msgDiv);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
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
                li.textContent = `${p.amount} Adet ${p.symbol} (Alış: ${p.buyPrice}$)`;
                ul.appendChild(li);
            });
        } else { ul.innerHTML = "<li>Henüz portföy eklememiş.</li>"; }
        modal.classList.remove("hidden");
    }
}
document.querySelector(".close-modal").addEventListener("click", () => document.getElementById("profile-modal").classList.add("hidden"));

setInterval(fetchMarketData, 60000);
fetchMarketData();
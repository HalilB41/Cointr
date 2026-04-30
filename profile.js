// ====== FIREBASE MODÜLLERİNİ İÇE AKTAR ======
import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, getDoc }   from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// ====== FIREBASE AYARLARI ======
const firebaseConfig = {
  apiKey: "AIzaSyDdjLuOBNN9Ad8SEJuYE0gO0521-fqoX0g",
  authDomain: "cointranaliz-802a1.firebaseapp.com",
  projectId: "cointranaliz-802a1",
  storageBucket: "cointranaliz-802a1.firebasestorage.app",
  messagingSenderId: "716928043593",
  appId: "1:716928043593:web:a196f1671c54f7bd594d98",
};

// ====== FIREBASE SERVİSLERİNİ BAŞLAT ======
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ====== DOM ELEMENTLERİNİ SEÇ ======
const usernameDisplay = document.getElementById("username-display"); // Üst bar
const viewUsername = document.getElementById("view-username"); // Profil başlığı
const viewEmail = document.getElementById("view-email");       // E-posta
const viewBio = document.getElementById("view-bio");           // Bio alanı

let currentUser = null;

// ====== KULLANICI GİRİŞİNİ KONTROL ET ======
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    viewEmail.textContent = user.email; // E-postayı her zaman göster
    loadProfileData(user.uid); // Firestore'dan ekstra verileri çek
  } else {
    window.location.href = "login.html";
  }
});

// ====== PROFİL VERİLERİNİ FİRESTORE'DAN YÜKLEME ======
async function loadProfileData(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      const username = data.username || "";
      const bio = data.bio || "Henüz bir açıklama eklenmemiş.";

      // Verileri GÖRÜNÜM sayfasına bas
      viewUsername.textContent = username ? username : "Kullanıcı Adı Belirlenmemiş";
      viewBio.textContent = bio;
      
      // Üst menüdeki adı güncelle
      usernameDisplay.textContent = username ? username : currentUser.email;
      
    } else {
      // Veritabanında kayıt yoksa varsayılanları bas
      usernameDisplay.textContent = currentUser.email;
      viewUsername.textContent = "Kullanıcı Adı Belirlenmemiş";
      viewBio.textContent = "Henüz bir açıklama eklenmemiş.";
    }
  } catch (error) {
    console.error("Profil yüklenirken hata oluştu:", error);
    alert("Profil bilgileri yüklenemedi!");
  }
}
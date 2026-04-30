// ====== FIREBASE MODÜLLERİNİ İÇE AKTAR ======
import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc }   from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

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
const profileForm = document.getElementById("profile-form");
const profileEmail = document.getElementById("profile-email");
const profileUsername = document.getElementById("profile-username");
const profileBio = document.getElementById("profile-bio");
const btnSaveProfile = document.getElementById("btn-save-profile");
const usernameDisplay = document.getElementById("username-display"); // Üst menüdeki e-posta alanı

const passwordForm = document.getElementById("password-form");
const newPassword = document.getElementById("new-password");
const btnSavePassword = document.getElementById("btn-save-password");

let currentUser = null; 

// ====== KULLANICI GİRİŞİNİ KONTROL ET ======
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    profileEmail.value = user.email; 
    loadProfileData(user.uid); 
  } else {
    window.location.href = "login.html";
  }
});

// ====== PROFİL VERİLERİNİ FİRESTORE'DAN YÜKLEME (Formu doldurmak için) ======
async function loadProfileData(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Veritabanındaki verilerle formdaki inputları doldur
      profileUsername.value = data.username || ""; 
      profileBio.value = data.bio || ""; 
      
      if (data.username) {
        usernameDisplay.textContent = data.username;
      } else {
        usernameDisplay.textContent = currentUser.email; 
      }
      
    } else {
      usernameDisplay.textContent = currentUser.email;
      console.log("Henüz profil oluşturulmamış.");
    }
  } catch (error) {
    console.error("Profil yüklenirken hata oluştu:", error);
  }
}

// ====== PROFİL BİLGİLERİNİ KAYDETME (Form Submit) ======
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault(); 
  btnSaveProfile.disabled = true;
  btnSaveProfile.textContent = "Kaydediliyor...";

  const newUsername = profileUsername.value.trim();
  const newBio = profileBio.value.trim();

  try {
    const docRef = doc(db, "users", currentUser.uid);
    await setDoc(docRef, {
        username: newUsername,
        bio: newBio
      }, { merge: true }); 

    alert("✅ Profil başarıyla güncellendi!");
    
    // === YENİ EKLENDİ: Kayıttan sonra GÖRÜNÜM sayfasına geri dön ===
    window.location.href = "profile.html";

  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    alert("❌ Profil güncellenirken bir hata oluştu: " + error.message);
  } finally {
    btnSaveProfile.disabled = false;
    btnSaveProfile.textContent = "Profili Kaydet";
  }
});


// ====== ŞİFRE DEĞİİŞTİRME (Form Submit) ======
passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = newPassword.value;

  if (pass.length < 6) {
    alert("Şifre en az 6 karakter olmalıdır!");
    return;
  }
  
  btnSavePassword.disabled = true;
  btnSavePassword.textContent = "Güncelleniyor...";

  try {
    await updatePassword(currentUser, pass);
    alert("✅ Şifre başarıyla güncellendi!");
    newPassword.value = ""; 
  } catch (error) {
    console.error("Şifre güncelleme hatası:", error);
    alert("❌ Hata: " + "Tavsiye: " + error.message + "\nGüvenlik nedeniyle, lütfen çıkış yapıp tekrar giriş yaptıktan sonra şifrenizi değiştirmeyi deneyin.");
  } finally {
    btnSavePassword.disabled = false;
    btnSavePassword.textContent = "Şifreyi Güncelle";
  }
});
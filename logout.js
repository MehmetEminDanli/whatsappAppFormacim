const fs = require('fs');
const path = require('path');

const authDir = path.join(__dirname, '.wwebjs_auth');

console.log('--- WhatsApp Oturum Sıfırlama Aracı ---');

if (fs.existsSync(authDir)) {
  try {
    fs.rmSync(authDir, { recursive: true, force: true });
    console.log('✅ Eski WhatsApp oturumu başarıyla silindi!');
    console.log('\nŞimdi yeni numaranızı bağlamak için:');
    console.log('1. Terminalde: npm start çalıştırın');
    console.log('2. Ekrana gelen QR kodu WhatsApp Business yüklü telefonunuzdan okutun.');
    console.log('   (WhatsApp Business > Bağlı Cihazlar > Cihaz Bağla)\n');
  } catch (err) {
    console.error('❌ Oturum silinirken hata oluştu:', err.message);
    console.log('Lütfen çalışan bir bot varsa (npm start) önce Ctrl + C ile durdurun ve tekrar deneyin.');
  }
} else {
  console.log('ℹ️ Kayıtlı aktif bir oturum klasörü (.wwebjs_auth) bulunamadı.');
  console.log('Doğrudan "npm start" yaparak WhatsApp Business hesabınızı bağlayabilirsiniz.\n');
}

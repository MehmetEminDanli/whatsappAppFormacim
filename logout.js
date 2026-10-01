const fs = require('fs');
const path = require('path');

const dirsToRemove = [
  path.join(__dirname, 'baileys_auth'),
  path.join(__dirname, '.wwebjs_auth')
];

console.log('--- WhatsApp Oturum Sıfırlama Aracı ---');

let removedAny = false;
for (const dir of dirsToRemove) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Oturum klasörü silindi: ${path.basename(dir)}`);
      removedAny = true;
    } catch (err) {
      console.error(`❌ ${path.basename(dir)} silinirken hata:`, err.message);
    }
  }
}

if (removedAny) {
  console.log('\nŞimdi yeni numaranızı bağlamak için:');
  console.log('1. Terminalde: npm start çalıştırın');
  console.log('2. Ekrana gelen QR kodu WhatsApp yüklü telefonunuzdan okutun.');
  console.log('   (WhatsApp > Bağlı Cihazlar > Cihaz Bağla)\n');
} else {
  console.log('ℹ️ Kayıtlı aktif bir oturum klasörü bulunamadı.');
  console.log('Doğrudan "npm start" yaparak WhatsApp hesabınızı bağlayabilirsiniz.\n');
}


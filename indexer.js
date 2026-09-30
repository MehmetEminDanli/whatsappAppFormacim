/**
 * formaciim.com Ürün İndeksleyici ve Yönetim Aracı
 * 
 * Kullanım:
 *  - Siteden otomatik tüm formaları indekslemek için: node indexer.js crawl
 *  - Ürünleri listelemek için:                       node indexer.js list
 *  - Arama testi yapmak için:                        node indexer.js search "F1"
 *  - Yeni ürün eklemek için:                         node indexer.js add "Ferrari F1" "https://formaciim.com/F1?product_id=2367" "1.650,00 TL" "F1" "Özel yarış forması"
 *  - Dışarıdan JSON aktarmak için:                   node indexer.js import urunler.json
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { searchProducts, loadProducts } = require('./productSearch');

const PRODUCTS_PATH = path.join(__dirname, 'products.json');

const CRAWL_CATEGORIES = [
  { url: 'https://formaciim.com/F1', category: 'F1' },
  { url: 'https://formaciim.com/retro-forma', category: 'Retro' },
  { url: 'https://formaciim.com/cocuk-forma', category: 'Çocuk' },
  { url: 'https://formaciim.com/forma', category: 'Sezonluk' },
  { url: 'https://formaciim.com/nba', category: 'NBA' },
  { url: 'https://formaciim.com/premier-league', category: 'Premier League' },
  { url: 'https://formaciim.com/la-liga', category: 'La Liga' },
  { url: 'https://formaciim.com/milli-takim', category: 'Milli Takım' }
];

function getBrowserExecutablePath() {
  const possiblePaths = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : 'help';

async function main() {
  switch (command) {
    case 'crawl': {
      console.log('🌐 formaciim.com kategorileri taranıyor...');
      const browser = await puppeteer.launch({
        executablePath: getBrowserExecutablePath(),
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');

      const existingProducts = loadProducts();
      const productMap = new Map();
      existingProducts.forEach(p => productMap.set(p.url, p));

      let totalFound = 0;

      for (const cat of CRAWL_CATEGORIES) {
        console.log(`\n⏳ Kategori taranıyor: [${cat.category}] ${cat.url}`);
        try {
          await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
          const items = await page.evaluate((categoryName) => {
            const list = [];
            const elements = document.querySelectorAll('.product-layout');
            elements.forEach(el => {
              const nameEl = el.querySelector('.name a');
              const priceEl = el.querySelector('.price');
              const descEl = el.querySelector('.description');
              if (nameEl && nameEl.href) {
                list.push({
                  title: nameEl.innerText.trim(),
                  url: nameEl.href,
                  price: priceEl ? priceEl.innerText.replace(/\s+/g, ' ').trim() : 'Fiyat için siteyi ziyaret edin',
                  category: categoryName,
                  description: descEl ? descEl.innerText.trim() : ''
                });
              }
            });
            return list;
          }, cat.category);

          console.log(`   -> ${items.length} adet ürün bulundu.`);
          items.forEach(item => {
            totalFound++;
            productMap.set(item.url, { ...productMap.get(item.url), ...item });
          });
        } catch (e) {
          console.warn(`   ⚠️ Kategori taranamadı (${cat.category}):`, e.message);
        }
      }

      await browser.close();

      const finalProductList = Array.from(productMap.values());
      fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(finalProductList, null, 2), 'utf8');

      console.log('\n==================================================');
      console.log(`✅ Tarama Tamamlandı!`);
      console.log(`Toplam taranan ürün: ${totalFound}`);
      console.log(`Kataloğa kaydedilen benzersiz ürün: ${finalProductList.length}`);
      console.log('==================================================\n');
      break;
    }

    case 'list': {
      const products = loadProducts();
      console.log(`\n📦 Toplam İndekslenmiş Ürün Sayısı: ${products.length}\n`);
      products.forEach((p, idx) => {
        console.log(`${idx + 1}. [${p.category || 'Genel'}] ${p.title} - ${p.price || 'Fiyat Belirtilmedi'}`);
        console.log(`   🔗 ${p.url}\n`);
      });
      break;
    }

    case 'search': {
      const query = args.slice(1).join(' ');
      if (!query) {
        console.log('Lütfen aranacak kelimeyi belirtin. Örnek: node indexer.js search "F1"');
        process.exit(1);
      }
      console.log(`\n🔍 "${query}" için arama yapılıyor...\n`);
      const results = searchProducts(query);
      if (results.matches.length === 0) {
        console.log('❌ Birebir ürün bulunamadı.');
        if (results.category) {
          console.log(`📂 Kategori Önerisi: ${results.category.name} -> ${results.category.url}`);
        }
        console.log(`🌐 Arama Linki: ${results.searchUrl}`);
      } else {
        console.log(`✅ ${results.matches.length} adet eşleşen ürün bulundu:`);
        results.matches.forEach((p, idx) => {
          console.log(`${idx + 1}. ${p.title} (${p.price})`);
          console.log(`   🔗 ${p.url}`);
          if (p.description) console.log(`   📝 ${p.description}`);
        });
        if (results.category) {
          console.log(`\n📂 İlgili Kategori: ${results.category.name} -> ${results.category.url}`);
        }
      }
      console.log('');
      break;
    }

    case 'add': {
      const title = args[1];
      const url = args[2];
      const price = args[3] || 'Fiyat için siteyi ziyaret edin';
      const category = args[4] || 'Genel';
      const description = args[5] || '';

      if (!title || !url) {
        console.log('Kullanım: node indexer.js add "Ürün Başlığı" "Ürün Linki" "Fiyat" "Kategori" "Açıklama"');
        process.exit(1);
      }

      const products = loadProducts();
      const existingIndex = products.findIndex(p => p.url === url || p.title.toLowerCase() === title.toLowerCase());
      const newProduct = {
        id: Date.now().toString(),
        title,
        url,
        price,
        category,
        description
      };

      if (existingIndex >= 0) {
        products[existingIndex] = { ...products[existingIndex], ...newProduct };
        console.log(`✅ Ürün güncellendi: ${title}`);
      } else {
        products.push(newProduct);
        console.log(`✅ Yeni ürün eklendi: ${title}`);
      }

      fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), 'utf8');
      console.log(`Toplam ürün sayısı: ${products.length}\n`);
      break;
    }

    case 'import': {
      const importFile = args[1];
      if (!importFile || !fs.existsSync(importFile)) {
        console.log('Lütfen geçerli bir JSON dosya yolu belirtin. Örnek: node indexer.js import urunler.json');
        process.exit(1);
      }

      try {
        const importData = JSON.parse(fs.readFileSync(importFile, 'utf8'));
        if (!Array.isArray(importData)) {
          console.error('Hata: JSON dosyası bir ürün dizisi (Array) içermelidir.');
          process.exit(1);
        }

        const products = loadProducts();
        let added = 0;
        let updated = 0;

        for (const item of importData) {
          if (!item.title || !item.url) continue;
          const idx = products.findIndex(p => p.url === item.url);
          if (idx >= 0) {
            products[idx] = { ...products[idx], ...item };
            updated++;
          } else {
            products.push({ id: Date.now().toString() + Math.random(), ...item });
            added++;
          }
        }

        fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), 'utf8');
        console.log(`✅ İçe aktarma tamamlandı! ${added} yeni eklendi, ${updated} güncellendi.`);
        console.log(`Toplam kayıtlı ürün sayısı: ${products.length}\n`);
      } catch (e) {
        console.error('İçe aktarma hatası:', e.message);
      }
      break;
    }

    default:
      console.log('\n--- Formacım Ürün İndeksleyici Komutları ---');
      console.log('1. node indexer.js crawl                        -> Siteden otomatik tüm kategorileri tarar ve ürünleri çeker');
      console.log('2. node indexer.js list                         -> Kayıtlı tüm ürün ve linkleri listeler');
      console.log('3. node indexer.js search "F1"                  -> Bir formanın eşleşmesini test eder');
      console.log('4. node indexer.js add "Başlık" "URL" "Fiyat"  -> Kataloğa yeni forma linki ekler');
      console.log('5. node indexer.js import dosya.json            -> Toplu ürün listesi aktarır\n');
      break;
  }
}

main();

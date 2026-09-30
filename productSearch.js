const fs = require('fs');
const path = require('path');

const PRODUCTS_PATH = path.join(__dirname, 'products.json');

// Takım, Kulüp, Sporcu ve Kategori Tanımları
const ENTITIES = [
  // Türk Takımları
  { id: 'galatasaray', names: ['galatasaray', 'cimbom', 'gs'], titleMatch: 'galatasaray', cleanSearch: 'Galatasaray' },
  { id: 'fenerbahce', names: ['fenerbahce', 'fener', 'fb'], titleMatch: 'fenerbahce', cleanSearch: 'Fenerbahçe' },
  { id: 'besiktas', names: ['besiktas', 'bjk', 'kartal'], titleMatch: 'besiktas', cleanSearch: 'Beşiktaş' },
  { id: 'trabzonspor', names: ['trabzonspor', 'trabzon', 'ts'], titleMatch: 'trabzonspor', cleanSearch: 'Trabzonspor' },

  // Yabancı Kulüpler
  { id: 'real_madrid', names: ['real madrid', 'madrid'], titleMatch: 'real madrid', cleanSearch: 'Real Madrid' },
  { id: 'barcelona', names: ['barcelona', 'barca'], titleMatch: 'barcelona', cleanSearch: 'Barcelona' },
  { id: 'milan', names: ['ac milan', 'milan'], titleMatch: 'milan', cleanSearch: 'Milan' },
  { id: 'inter', names: ['inter'], titleMatch: 'inter', cleanSearch: 'Inter' },
  { id: 'juventus', names: ['juventus', 'juve'], titleMatch: 'juventus', cleanSearch: 'Juventus' },
  { id: 'napoli', names: ['napoli'], titleMatch: 'napoli', cleanSearch: 'Napoli' },
  { id: 'arsenal', names: ['arsenal'], titleMatch: 'arsenal', cleanSearch: 'Arsenal' },
  { id: 'chelsea', names: ['chelsea'], titleMatch: 'chelsea', cleanSearch: 'Chelsea' },
  { id: 'liverpool', names: ['liverpool'], titleMatch: 'liverpool', cleanSearch: 'Liverpool' },
  { id: 'manchester_city', names: ['manchester city', 'man city'], titleMatch: 'manchester city', cleanSearch: 'Manchester City' },
  { id: 'manchester_united', names: ['manchester united', 'man united'], titleMatch: 'manchester united', cleanSearch: 'Manchester United' },
  { id: 'bayern', names: ['bayern münih', 'bayern munih', 'bayern'], titleMatch: 'bayern', cleanSearch: 'Bayern' },
  { id: 'dortmund', names: ['dortmund'], titleMatch: 'dortmund', cleanSearch: 'Dortmund' },
  { id: 'psg', names: ['psg', 'paris saint germain'], titleMatch: 'psg', cleanSearch: 'PSG' },
  { id: 'venezia', names: ['venezia'], titleMatch: 'venezia', cleanSearch: 'Venezia' },

  // Milli Takımlar
  { id: 'turkiye', names: ['turkiye', 'milli takim', 'turk milli'], titleMatch: 'turkiye', cleanSearch: 'Türkiye Milli Takım' },
  { id: 'arjantin', names: ['arjantin'], titleMatch: 'arjantin', cleanSearch: 'Arjantin' },
  { id: 'brezilya', names: ['brezilya'], titleMatch: 'brezilya', cleanSearch: 'Brezilya' },
  { id: 'fransa', names: ['fransa'], titleMatch: 'fransa', cleanSearch: 'Fransa' },
  { id: 'italya', names: ['italya'], titleMatch: 'italya', cleanSearch: 'İtalya' },
  { id: 'ispanya', names: ['ispanya'], titleMatch: 'ispanya', cleanSearch: 'İspanya' },
  { id: 'almanya', names: ['almanya'], titleMatch: 'almanya', cleanSearch: 'Almanya' },
  { id: 'ingiltere', names: ['ingiltere'], titleMatch: 'ingiltere', cleanSearch: 'İngiltere' },
  { id: 'portekiz', names: ['portekiz'], titleMatch: 'portekiz', cleanSearch: 'Portekiz' },
  { id: 'hollanda', names: ['hollanda'], titleMatch: 'hollanda', cleanSearch: 'Hollanda' },

  // F1 & Motor Sporları
  { id: 'f1', names: ['f1', 'formula', 'formula 1'], titleMatch: 'f1', cleanSearch: 'F1', categoryUrl: 'https://formaciim.com/F1' },
  { id: 'ferrari', names: ['ferrari'], titleMatch: 'ferrari', cleanSearch: 'Ferrari', categoryUrl: 'https://formaciim.com/F1' },
  { id: 'aston_martin', names: ['aston martin', 'alonso'], titleMatch: 'aston martin', cleanSearch: 'Aston Martin', categoryUrl: 'https://formaciim.com/F1' },
  { id: 'redbull', names: ['redbull', 'red bull', 'verstappen'], titleMatch: 'red bull', cleanSearch: 'Red Bull', categoryUrl: 'https://formaciim.com/F1' },
  { id: 'mercedes_f1', names: ['mercedes f1', 'hamilton'], titleMatch: 'mercedes', cleanSearch: 'Mercedes F1', categoryUrl: 'https://formaciim.com/F1' },

  // Efsane Oyuncular
  { id: 'maradona', names: ['maradona'], titleMatch: 'maradona', cleanSearch: 'Maradona' },
  { id: 'zidane', names: ['zidane'], titleMatch: 'zidane', cleanSearch: 'Zidane' },
  { id: 'beckham', names: ['beckham'], titleMatch: 'beckham', cleanSearch: 'Beckham' },
  { id: 'baggio', names: ['baggio'], titleMatch: 'baggio', cleanSearch: 'Baggio' },
  { id: 'okocha', names: ['okocha'], titleMatch: 'okocha', cleanSearch: 'Okocha' },
  { id: 'jardel', names: ['jardel'], titleMatch: 'jardel', cleanSearch: 'Jardel' }
];

// Genel Kategori Bağlantıları
const CATEGORIES = [
  { keywords: ['f1', 'formula', 'formula 1'], url: 'https://formaciim.com/F1', name: 'Formula 1 Koleksiyonu' },
  { keywords: ['retro', 'nostalji', 'efsane', 'eski', '90lar', '2000ler', 'klasik'], url: 'https://formaciim.com/retro-forma', name: 'Retro Forma Koleksiyonu' },
  { keywords: ['cocuk', 'bebek', 'yas', 'genc'], url: 'https://formaciim.com/cocuk-forma', name: 'Çocuk Forma Takımları' },
  { keywords: ['nba', 'basketbol', 'jordan', 'lakers', 'chicago'], url: 'https://formaciim.com/nba', name: 'NBA Formaları' },
  { keywords: ['profesyonel', 'player', 'mac formasi', 'slim fit'], url: 'https://formaciim.com/profesyonel-mac-formasi', name: 'Profesyonel Maç Formaları' },
  { keywords: ['premier', 'ingiltere'], url: 'https://formaciim.com/premier-league', name: 'Premier League Formaları' },
  { keywords: ['la liga', 'ispanya'], url: 'https://formaciim.com/la-liga', name: 'La Liga Formaları' }
];

// Konuşma ve dolgu kelimeleri (arama sorgusundan temizlenecekler)
const CONVERSATIONAL_WORDS = new Set([
  'forma', 'formasi', 'forması', 'formalar', 'formalari', 'formaları',
  'tshirt', 'tisort', 'tişört', 'sort', 'şort',
  'ne', 'kadar', 'kac', 'kaç', 'tl', 'fiyat', 'fiyati', 'fiyatı', 'ucret', 'ücret',
  'var', 'mi', 'mı', 'mu', 'mü', 'varmı', 'varmi', 'yok',
  'almak', 'istiyorum', 'istiyom', 'bakiyorum', 'arıyorum', 'ariyorum',
  'yazdim', 'yazmistim', 'yazmıştım', 'bakmistim', 'bakmıştım',
  'icin', 'için', 'bir', 'bu', 'su', 'şu', 've', 'ile', 'de', 'da',
  'miyiz', 'misiniz', 'misin', 'link', 'linki', 'site', 'siteden',
  'resim', 'gorsel', 'foto', 'fotograf', 'boy', 'kilo', 'beden',
  'merhaba', 'selam', 'iyi', 'gunler', 'günler', 'aksamlar', 'akşamlar',
  'lutfen', 'lütfen', 'tesekkur', 'teşekkür', 'ederim', 'acaba', 'bakar', 'misiniz'
]);

/**
 * Türkçe karakterleri normalize eder
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Kullanıcı mesajındaki Takım / Sporcu / Varlığı (Entity) tespit eder
 */
function detectEntity(normText) {
  const words = normText.split(' ');
  for (const ent of ENTITIES) {
    for (const alias of ent.names) {
      if (alias.includes(' ')) {
        if (normText.includes(alias)) return ent;
      } else {
        if (words.includes(alias)) return ent;
      }
    }
  }
  return null;
}

/**
 * products.json dosyasından ürünleri okur
 */
function loadProducts() {
  try {
    if (fs.existsSync(PRODUCTS_PATH)) {
      const data = fs.readFileSync(PRODUCTS_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[Ürün Listesi Okuma Hatası]:', err.message);
  }
  return [];
}

/**
 * Kullanıcı mesajına göre ürünleri arar
 */
function searchProducts(userMessage) {
  const products = loadProducts();
  const normalizedQuery = normalizeText(userMessage);

  // Varlık (Takım / Sporcu) Tespiti
  const detectedEntity = detectEntity(normalizedQuery);

  // Dolgu kelimelerden arındırılmış temiz anahtar kelimeler
  const rawTokens = normalizedQuery.split(' ').filter(t => t.length > 1);
  const cleanTokens = rawTokens.filter(t => !CONVERSATIONAL_WORDS.has(t));

  // Temiz site içi arama terimi
  let cleanSearchTerm = cleanTokens.join(' ');
  if (!cleanSearchTerm && detectedEntity) {
    cleanSearchTerm = detectedEntity.cleanSearch;
  }
  if (!cleanSearchTerm) {
    cleanSearchTerm = 'forma';
  }

  // Arama URL'i
  const searchUrl = `https://formaciim.com/index.php?route=product/search&search=${encodeURIComponent(detectedEntity ? detectedEntity.cleanSearch : cleanSearchTerm)}`;

  // 1. Ürün Havuzunu Filtrele:
  // Eğer belirli bir takım/varlık tespit edilmişse, SADECE o takıma ait ürünleri incele!
  // ASLA başka takımın formalarını eşleştirmeye dahil etme!
  let candidateProducts = products;
  if (detectedEntity) {
    candidateProducts = products.filter(p => {
      const normTitle = normalizeText(p.title);
      const normCat = normalizeText(p.category || '');
      const normDesc = normalizeText(p.description || '');
      return normTitle.includes(detectedEntity.titleMatch) || 
             normCat.includes(detectedEntity.titleMatch) ||
             normDesc.includes(detectedEntity.titleMatch);
    });
  }

  // 2. Ürünleri puanla
  const scoredProducts = [];
  const tokensToScore = cleanTokens.length > 0 ? cleanTokens : rawTokens;

  for (const p of candidateProducts) {
    const normTitle = normalizeText(p.title);
    const normDesc = normalizeText(p.description || '');
    const titleWords = normTitle.split(' ');

    let score = 0;
    let matchCount = 0;

    for (const token of tokensToScore) {
      if (titleWords.includes(token)) {
        score += 30;
        matchCount++;
      } else if (normTitle.includes(token)) {
        score += 15;
        matchCount++;
      } else if (normDesc.includes(token)) {
        score += 5;
      }
    }

    // Eğer takım tespit edildiyse, takımın her forması temel ilgi puanı alır
    if (detectedEntity) {
      score += 10;
    }

    if (score >= 20 || (detectedEntity && candidateProducts.length > 0)) {
      scoredProducts.push({ product: p, score, matchCount });
    }
  }

  // Puan ve eşleşme sayısına göre sırala
  scoredProducts.sort((a, b) => b.score - a.score || b.matchCount - a.matchCount);

  // En iyi 3 ürünü al
  const matches = scoredProducts.slice(0, 3).map(item => item.product);

  // Kullanıcının aradığı spesifik model mi yoksa genel mi olduğunu belirle
  // Örn: Kullanıcı "2012 deplasman" dedi ama bulunan ürünler "2000 uefa" ise tam eşleşme yoktur
  let isExactMatch = false;
  if (matches.length > 0) {
    const topItem = scoredProducts[0];
    // Eğer tüm temiz kelimelerden en az biri veya ikisi ürün başlığında tam geçiyorsa
    const topNormTitle = normalizeText(topItem.product.title);
    const specificTokens = cleanTokens.filter(t => !detectedEntity || !detectedEntity.names.includes(t));
    if (specificTokens.length === 0 || specificTokens.some(t => topNormTitle.includes(t))) {
      isExactMatch = true;
    }
  }

  // Kategori Tespiti
  let matchedCategory = null;
  if (detectedEntity && detectedEntity.categoryUrl) {
    matchedCategory = { name: detectedEntity.cleanSearch, url: detectedEntity.categoryUrl };
  } else {
    for (const cat of CATEGORIES) {
      for (const kw of cat.keywords) {
        if (normalizedQuery.includes(kw)) {
          matchedCategory = cat;
          break;
        }
      }
      if (matchedCategory) break;
    }
  }

  return {
    matches,
    detectedEntity,
    isExactMatch,
    category: matchedCategory,
    searchUrl,
    cleanSearchTerm: detectedEntity ? detectedEntity.cleanSearch : cleanSearchTerm
  };
}

/**
 * Gemini'ye aktarılacak ürün bağlamını oluşturur
 */
function buildProductContext(userMessage) {
  const result = searchProducts(userMessage);

  // Eğer hiçbir şey bulunamadı ve kategori yoksa boş dön
  if (result.matches.length === 0 && !result.category && !result.detectedEntity) {
    return '';
  }

  let context = '\n\n### SİTEDEKİ ÜRÜN BİLGİSİ (formaciim.com):\n';

  if (result.detectedEntity) {
    if (result.isExactMatch && result.matches.length > 0) {
      // Aranan spesifik ürün bulundu
      context += `Müşteri "${result.detectedEntity.cleanSearch}" ile ilgili ürün sordu ve sitemizde birebir eşleşen ürünler bulundu:\n`;
      for (const p of result.matches) {
        context += `- **${p.title}** | Fiyat: ${p.price}\n`;
        context += `  Direkt Ürün Linki: ${p.url}\n`;
        if (p.description) context += `  Açıklama: ${p.description}\n`;
      }
      context += `\nKURAL: Bu ürünün özelliklerini anlat ve yukarıdaki linki AÇIK URL olarak müşteriye ver.\n`;
    } else {
      // Müşteri takımı sordu ama o yıl/özel model (örn: 2012 deplasman) yok!
      context += `ÖNEMLİ KURAL: Müşteri "${result.detectedEntity.cleanSearch}" takımına ait spesifik bir model aradı ancak bu spesifik model şu anda sitemizde bulunmuyor.\n`;
      context += `KESİNLİKLE BAŞKA BİR TAKIMIN (Milan, Fenerbahçe, Beşiktaş vb.) FORMASINI ÖNERME!\n`;
      context += `Müşteriye aradığı bu özel modelin şu an sitemizde görünmediğini dürüstçe belirt.\n`;
      if (result.matches.length > 0) {
        context += `İlgisini çekebilecek sitemizdeki mevcut diğer ${result.detectedEntity.cleanSearch} nostalji formalarını alternatif olarak göster:\n`;
        for (const p of result.matches) {
          context += `- **${p.title}** | Fiyat: ${p.price}\n`;
          context += `  Direkt Ürün Linki: ${p.url}\n`;
        }
      }
      context += `\n${result.detectedEntity.cleanSearch} ile ilgili tüm formaları inceleyebileceği temiz arama linkini ver:\n`;
      context += `Arama Linki: ${result.searchUrl}\n`;
    }
  } else if (result.matches.length > 0) {
    context += `Sitemizde bulunan eşleşen ürünler:\n`;
    for (const p of result.matches) {
      context += `- **${p.title}** | Fiyat: ${p.price}\n`;
      context += `  Direkt Ürün Linki: ${p.url}\n`;
      if (p.description) context += `  Açıklama: ${p.description}\n`;
    }
    if (result.category) {
      context += `Kategori Linki: ${result.category.name} -> ${result.category.url}\n`;
    }
    context += `Genel Arama Linki: ${result.searchUrl}\n`;
  } else if (result.category) {
    context += `İlgili Kategori Linki: ${result.category.name} -> ${result.category.url}\n`;
    context += `Arama Linki: ${result.searchUrl}\n`;
  }

  context += '\nKURAL: WhatsApp mesajlarında linklerin tıklanabilir olması için linkleri MUTLAKA AÇIK URL olarak yaz (Örn: https://formaciim.com/...). Asla [metin](link) şeklinde gizleme, doğrudan açık linki göster.\n';

  return context;
}

module.exports = {
  searchProducts,
  buildProductContext,
  loadProducts
};

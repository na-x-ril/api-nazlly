import { request } from 'undici';

// Konfigurasi whitelist dan blacklist hardcoded
const filterConfig = {
  ytInitialData: [
    'videoPrimaryInfoRenderer', // Whitelist: Sertakan title di setiap videoPrimaryInfoRenderer
    '!videoPrimaryInfoRenderer.videoActions', // Blacklist: Abaikan videoActions di setiap videoPrimaryInfoRenderer
    '!videoPrimaryInfoRenderer.updatedMetadataEndpoint', // Whitelist: Sertakan viewCount di setiap videoPrimaryInfoRenderer
    'videoSecondaryInfoRenderer.owner', // Whitelist: Sertakan owner di setiap videoSecondaryInfoRenderer
    '!videoSecondaryInfoRenderer.owner.videoOwnerRenderer.membershipButton', // Blacklist: Abaikan badges di setiap videoSecondaryInfoRenderer
    '!trackingParams', // Blacklist: Abaikan trackingParams di semua level'
    '!clickTrackingParams', // Blacklist: Abaikan clickTrackingParams di semua level
    '!miniplayer', // Blacklist: Abaikan miniplayer di semua level
    '!contextParams', // Blacklist: Abaikan contextParams di semua level
    '!dislikeButtonViewModel', // Blacklist: Abaikan dislikeButtonViewModel di semua level
    '!segmentedLikeDislikeButtonViewModel.dislikeButtonViewModel', // Blacklist: Abaikan dislikeButtonViewModel di segmentedLikeDislikeButtonViewModel
  ],
  ytInitialPlayerResponse: [
    'videoDetails', // Whitelist: Sertakan videoDetails
    'playabilityStatus', // Whitelist: Sertakan playabilityStatus
    '!playabilityStatus.miniplayer', // Blacklist: Abaikan miniplayer di playabilityStatus
    '!playabilityStatus.contextParams', // Blacklist: Abaikan contextParams di playability
    'playerConfig', // Whitelist: Sertakan playerConfig
    'microformat', // Whitelist: Sertakan microformat
    '!miniplayer', // Blacklist: Abaikan miniplayer di semua level
    '!contextParams', // Blacklist: Abaikan contextParams di semua level
    '!trackingParams', // Blacklist: Abaikan trackingParams di semua level
    '!clickTrackingParams', // Blacklist: Abaikan clickTrackingParams di semua level
    '!videoDetails.keywords', // Blacklist: Abaikan keywords
    '!playabilityStatus.reason', // Blacklist: Abaikan reason
    '!playerMicroformatRenderer.availableCountries', // Blacklist: Abaikan availableCountries
  ]
};

// Fungsi untuk memformat tanggal ke format yang lebih mudah dibaca
function formatDateTime(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (e) {
    console.warn(`Failed to format date: ${dateString}`, e);
    return null;
  }
}

// Fungsi untuk menghitung relative time
function getRelativeDateText(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMinutes < 1) return `beberapa detik yang lalu`;
    if (diffMinutes <= 119) return `${diffMinutes} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 30) return `${diffDays} hari yang lalu`;
    if (diffMonths < 12) return `${diffMonths} bulan yang lalu`;
    return `${diffYears} tahun yang lalu`;
  } catch (e) {
    console.warn(`Failed to calculate relative date: ${dateString}`, e);
    return null;
  }
}

// Fungsi utama untuk mengambil dan memparse data YouTube
// utils/parser.js
export async function fetchYouTubeData(videoId, headers = {}) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Fetching (with cookies) from: ${url}`);

  // Merge incoming headers with minimal defaults
  const finalHeaders = {
    'User-Agent':
      headers['user-agent'] ||
      'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': headers['accept-language'] || 'en-US,en;q=0.5',
    'Accept-Encoding': 'identity',
    'Sec-GPC': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    ...headers,
  };

  try {
    const { statusCode, body } = await request(url, {
      headers: finalHeaders,
    });

    if (statusCode !== 200) {
      throw new Error(`Fetch failed: ${statusCode}`);
    }

    const html = await body.text();
    console.log(`Response length: ${html.length} characters`);

    const ytInitialData    = extractJSON(html, 'ytInitialData', filterConfig.ytInitialData);
    const ytInitialPlayerResponse = extractJSON(html, 'ytInitialPlayerResponse', filterConfig.ytInitialPlayerResponse);

    return { ytInitialData, ytInitialPlayerResponse };
  } catch (error) {
    console.error(`Error in fetchYouTubeData for videoId ${videoId}:`, error);
    throw error;
  }
}

// Fungsi untuk memfilter objek JSON berdasarkan config
function filterData(obj, config) {
  if (!obj || typeof obj !== 'object') return obj;

  // Pisahkan whitelist dan blacklist
  const whitelist = config.filter(path => !path.startsWith('!')).map(path => path.split('.').flatMap(s => s.match(/(\w+)\[(\d+)\]/) ? [s.match(/(\w+)\[(\d+)\]/)[1], parseInt(s.match(/(\w+)\[(\d+)\]/)[2])] : [s]));
  const blacklist = config.filter(path => path.startsWith('!')).map(path => path.slice(1).split('.').flatMap(s => s.match(/(\w+)\[(\d+)\]/) ? [s.match(/(\w+)\[(\d+)\]/)[1], parseInt(s.match(/(\w+)\[(\d+)\]/)[2])] : [s]));
  const blacklistFields = blacklist.filter(segments => segments.length === 1).map(s => s[0]);

  // Fungsi untuk mengatur nilai path
  const setPathValue = (o, segments, value) => {
    let temp = o;
    for (let i = 0; i < segments.length - 1; i++) {
      const s = segments[i];
      temp[s] = temp[s] || (isNaN(segments[i + 1]) ? {} : []);
      temp = temp[s];
    }
    temp[segments[segments.length - 1]] = value;
  };

  // Fungsi rekursif untuk mencari dan mengumpulkan properti whitelist
  const collectWhitelisted = (o, whitelist, result = {}, parentPath = []) => {
    if (!o || typeof o !== 'object') return;

    // Periksa setiap properti di objek saat ini
    Object.entries(o).forEach(([key, value]) => {
      const currentPath = [...parentPath, key];

      // Periksa apakah path saat ini atau properti cocok dengan whitelist
      whitelist.forEach(wlSegments => {
        const wlStr = wlSegments.join('.').replace(/\.(\d+)/g, '[$1]');
        const currentPathStr = currentPath.join('.').replace(/\.(\d+)/g, '[$1]');
        
        // Cocokkan jika path whitelist adalah akhir dari path saat ini
        if (currentPathStr.endsWith(wlStr)) {
          const relativePath = currentPath.slice(-wlSegments.length);
          setPathValue(result, relativePath, value);
        }
      });

      // Tambahkan formatted version dan relativeDateText untuk field tanggal
      if ((key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) && 
          typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        const formattedValue = formatDateTime(value);
        if (formattedValue) {
          setPathValue(result, [...parentPath, `formatted${key.charAt(0).toUpperCase() + key.slice(1)}`], formattedValue);
        }
        const relativeValue = getRelativeDateText(value);
        if (relativeValue) {
          setPathValue(result, [...parentPath, `relativeDateText${key.charAt(0).toUpperCase() + key.slice(1)}`], relativeValue);
        }
      }

      // Lanjutkan pencarian rekursif
      if (Array.isArray(value) || typeof value === 'object') {
        collectWhitelisted(value, whitelist, result, currentPath);
      }
    });

    return result;
  };

  // Fungsi rekursif untuk menghapus properti blacklist
  const removeBlacklisted = (o, blacklist, blacklistFields) => {
    if (!o || typeof o !== 'object') return;

    // Hapus blacklist fields di semua level
    blacklistFields.forEach(field => delete o[field]);

    // Hapus blacklist paths
    blacklist.filter(segments => segments.length > 1).forEach(segments => {
      let temp = o;
      for (let i = 0; i < segments.length - 1; i++) {
        const s = segments[i];
        if (!temp[s]) return;
        temp = temp[s];
      }
      delete temp[segments[segments.length - 1]];
    });

    // Lanjutkan rekursif ke anak-anak
    Object.values(o).forEach(value => {
      if (Array.isArray(value) || typeof value === 'object') {
        removeBlacklisted(value, blacklist, blacklistFields);
      }
    });
  };

  // Proses whitelist
  let result = collectWhitelisted(obj, whitelist);

  // Proses blacklist
  removeBlacklisted(result, blacklist, blacklistFields);

  return result;
}

// Fungsi untuk mengekstrak JSON dengan multiple patterns
function extractJSON(text, varName, config) {
  const patterns = [
    // Pola 1: ytInitialData = {...}
    new RegExp(`(?:var |const |let |\\s*)${varName}\\s*=[=]?\\s*(\\{[\\s\\S]*?\\})(?=\\s*;|\\s*<\\/script>|\\s*$)`, 's'),
    // Pola 2: window["ytInitialData"] = {...}
    new RegExp(`window\\s*\\[\\s*["']${varName}["']\\s*\\]\\s*=[=]?\\s*(\\{[\\s\\S]*?\\})(?=\\s*;|\\s*<\\/script>|\\s*$)`, 's'),
    // Pola 3: ytInitialData = {...} dengan whitespace fleksibel
    new RegExp(`(?:\\s*)${varName}\\s*=[=]?\\s*(\\{[\\s\\S]*?\\})\\s*(?=;|<\\/script>|$)`, 's'),
    // Pola 4: JSON dalam script tag tanpa var
    new RegExp(`<script[^>]*>\\s*${varName}\\s*=[=]?\\s*(\\{[\\s\\S]*?\\})\\s*(?:;|<\\/script>)`, 's')
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      console.log(`extractJSON - ${varName} found with pattern ${i + 1}`);
      try {
        const parsed = JSON.parse(match[1]);
        return filterData(parsed, config);
      } catch (e) {
        console.warn(`extractJSON - Failed to parse ${varName} with pattern ${i + 1}:`, e);
        continue;
      }
    }
  }

  // Debugging: Simpan snippet HTML untuk analisis
  const snippet = text.slice(0, 500);
  console.error(`[${varName}] not found. HTML snippet: ${snippet}`);
  throw new Error(`[${varName}] not found`);
}
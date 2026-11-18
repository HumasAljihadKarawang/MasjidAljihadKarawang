export interface PrayerTimes {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
  Midnight: string
  Imsak: string
  Firstthird: string
  Lastthird: string
}

export interface PrayerTimesResponse {
  code: number
  status: string
  data: {
    timings: PrayerTimes
    date: {
      readable: string
      timestamp: string
      hijri: {
        date: string
        format: string
        day: string
        weekday: { en: string; ar: string }
        month: { number: number; en: string; ar: string }
        year: string
        designation: { abbreviated: string; expanded: string }
        holidays: string[]
      }
      gregorian: {
        date: string
        format: string
        day: string
        weekday: { en: string }
        month: { number: number; en: string }
        year: string
        designation: { abbreviated: string; expanded: string }
      }
    }
    meta: {
      latitude: number
      longitude: number
      timezone: string
      method: { id: number; name: string }
      school: string
    }
  }
}

export type TimezoneID = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'
export type TimezoneLabel = 'WIB' | 'WITA' | 'WIT'

export interface RegencyCity {
  id: string
  name: string
  province: string
  lat: number
  lng: number
  timezone: TimezoneID
  tzLabel: TimezoneLabel
}

export interface ProvinceData {
  name: string
  timezone: TimezoneID
  tzLabel: TimezoneLabel
  cities: Omit<RegencyCity, 'province' | 'timezone' | 'tzLabel'>[]
}

// Checkpoint utama: Kab. Karawang, Jawa Barat (WIB)
export const DEFAULT_LOCATION: RegencyCity = {
  id: 'jabar-karawang',
  name: 'Kab. Karawang',
  province: 'Jawa Barat',
  lat: -6.3227,
  lng: 107.3376,
  timezone: 'Asia/Jakarta',
  tzLabel: 'WIB',
}

// Data Provinsi & Kabupaten/Kota se-Indonesia
export const INDONESIA_PROVINCES_RAW: ProvinceData[] = [
  {
    name: 'Jawa Barat',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'jabar-karawang', name: 'Kab. Karawang', lat: -6.3227, lng: 107.3376 },
      { id: 'jabar-bekasi-kab', name: 'Kab. Bekasi', lat: -6.2645, lng: 107.1407 },
      { id: 'jabar-bekasi-kota', name: 'Kota Bekasi', lat: -6.2383, lng: 106.9756 },
      { id: 'jabar-purwakarta', name: 'Kab. Purwakarta', lat: -6.5569, lng: 107.4433 },
      { id: 'jabar-subang', name: 'Kab. Subang', lat: -6.5715, lng: 107.7587 },
      { id: 'jabar-bandung-kota', name: 'Kota Bandung', lat: -6.9175, lng: 107.6191 },
      { id: 'jabar-bandung-kab', name: 'Kab. Bandung', lat: -7.0251, lng: 107.5198 },
      { id: 'jabar-bandung-barat', name: 'Kab. Bandung Barat', lat: -6.8452, lng: 107.4889 },
      { id: 'jabar-cimahi', name: 'Kota Cimahi', lat: -6.8722, lng: 107.5425 },
      { id: 'jabar-bogor-kab', name: 'Kab. Bogor', lat: -6.4797, lng: 106.8249 },
      { id: 'jabar-bogor-kota', name: 'Kota Bogor', lat: -6.5971, lng: 106.8060 },
      { id: 'jabar-depok', name: 'Kota Depok', lat: -6.4025, lng: 106.7942 },
      { id: 'jabar-cianjur', name: 'Kab. Cianjur', lat: -6.8168, lng: 107.1425 },
      { id: 'jabar-sukabumi-kab', name: 'Kab. Sukabumi', lat: -6.9885, lng: 106.5506 },
      { id: 'jabar-sukabumi-kota', name: 'Kota Sukabumi', lat: -6.9277, lng: 106.9300 },
      { id: 'jabar-garut', name: 'Kab. Garut', lat: -7.2279, lng: 107.9087 },
      { id: 'jabar-tasikmalaya-kab', name: 'Kab. Tasikmalaya', lat: -7.3590, lng: 108.1068 },
      { id: 'jabar-tasikmalaya-kota', name: 'Kota Tasikmalaya', lat: -7.3274, lng: 108.2207 },
      { id: 'jabar-ciamis', name: 'Kab. Ciamis', lat: -7.3257, lng: 108.3534 },
      { id: 'jabar-banjar', name: 'Kota Banjar', lat: -7.3706, lng: 108.5342 },
      { id: 'jabar-pangandaran', name: 'Kab. Pangandaran', lat: -7.6841, lng: 108.6512 },
      { id: 'jabar-sumedang', name: 'Kab. Sumedang', lat: -6.8381, lng: 107.9275 },
      { id: 'jabar-majalengka', name: 'Kab. Majalengka', lat: -6.8364, lng: 108.2274 },
      { id: 'jabar-kuningan', name: 'Kab. Kuningan', lat: -6.9758, lng: 108.4831 },
      { id: 'jabar-cirebon-kab', name: 'Kab. Cirebon', lat: -6.7641, lng: 108.4789 },
      { id: 'jabar-cirebon-kota', name: 'Kota Cirebon', lat: -6.7320, lng: 108.5523 },
      { id: 'jabar-indramayu', name: 'Kab. Indramayu', lat: -6.3276, lng: 108.3249 },
    ],
  },
  {
    name: 'DKI Jakarta',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'dki-jakpus', name: 'Kota Jakarta Pusat', lat: -6.1805, lng: 106.8284 },
      { id: 'dki-jaksel', name: 'Kota Jakarta Selatan', lat: -6.2615, lng: 106.8106 },
      { id: 'dki-jaktim', name: 'Kota Jakarta Timur', lat: -6.2250, lng: 106.9004 },
      { id: 'dki-jakbar', name: 'Kota Jakarta Barat', lat: -6.1674, lng: 106.7637 },
      { id: 'dki-jakut', name: 'Kota Jakarta Utara', lat: -6.1214, lng: 106.9128 },
      { id: 'dki-kep-seribu', name: 'Kab. Kepulauan Seribu', lat: -5.7458, lng: 106.5993 },
    ],
  },
  {
    name: 'Banten',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'banten-tangerang-kota', name: 'Kota Tangerang', lat: -6.1783, lng: 106.6319 },
      { id: 'banten-tangsel', name: 'Kota Tangerang Selatan', lat: -6.2886, lng: 106.7179 },
      { id: 'banten-tangerang-kab', name: 'Kab. Tangerang', lat: -6.2024, lng: 106.4945 },
      { id: 'banten-serang-kota', name: 'Kota Serang', lat: -6.1200, lng: 106.1503 },
      { id: 'banten-serang-kab', name: 'Kab. Serang', lat: -6.1353, lng: 106.1381 },
      { id: 'banten-cilegon', name: 'Kota Cilegon', lat: -6.0025, lng: 106.0111 },
      { id: 'banten-lebak', name: 'Kab. Lebak', lat: -6.5644, lng: 106.2522 },
      { id: 'banten-pandeglang', name: 'Kab. Pandeglang', lat: -6.3086, lng: 106.1067 },
    ],
  },
  {
    name: 'Jawa Tengah',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'jateng-semarang-kota', name: 'Kota Semarang', lat: -6.9667, lng: 110.4167 },
      { id: 'jateng-semarang-kab', name: 'Kab. Semarang', lat: -7.1319, lng: 110.4050 },
      { id: 'jateng-surakarta', name: 'Kota Surakarta (Solo)', lat: -7.5755, lng: 110.8243 },
      { id: 'jateng-magelang-kota', name: 'Kota Magelang', lat: -7.4797, lng: 110.2177 },
      { id: 'jateng-pekalongan-kota', name: 'Kota Pekalongan', lat: -6.8886, lng: 109.6753 },
      { id: 'jateng-tegal-kota', name: 'Kota Tegal', lat: -6.8694, lng: 109.1402 },
      { id: 'jateng-salatiga', name: 'Kota Salatiga', lat: -7.3305, lng: 110.5084 },
      { id: 'jateng-banyumas', name: 'Kab. Banyumas (Purwokerto)', lat: -7.4244, lng: 109.2302 },
      { id: 'jateng-cilacap', name: 'Kab. Cilacap', lat: -7.7279, lng: 109.0079 },
      { id: 'jateng-brebes', name: 'Kab. Brebes', lat: -6.8706, lng: 109.0426 },
      { id: 'jateng-kebumen', name: 'Kab. Kebumen', lat: -7.6685, lng: 109.6512 },
      { id: 'jateng-kudus', name: 'Kab. Kudus', lat: -6.8048, lng: 110.8405 },
      { id: 'jateng-jepara', name: 'Kab. Jepara', lat: -6.5888, lng: 110.6684 },
      { id: 'jateng-demak', name: 'Kab. Demak', lat: -6.8943, lng: 110.6385 },
      { id: 'jateng-klaten', name: 'Kab. Klaten', lat: -7.7058, lng: 110.6064 },
      { id: 'jateng-sragen', name: 'Kab. Sragen', lat: -7.4265, lng: 111.0221 },
      { id: 'jateng-wonogiri', name: 'Kab. Wonogiri', lat: -7.8143, lng: 110.9255 },
    ],
  },
  {
    name: 'DI Yogyakarta',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'diy-yogyakarta', name: 'Kota Yogyakarta', lat: -7.7956, lng: 110.3695 },
      { id: 'diy-sleman', name: 'Kab. Sleman', lat: -7.7162, lng: 110.3554 },
      { id: 'diy-bantul', name: 'Kab. Bantul', lat: -7.8878, lng: 110.3289 },
      { id: 'diy-kulonprogo', name: 'Kab. Kulon Progo', lat: -7.8569, lng: 110.1604 },
      { id: 'diy-gunungkidul', name: 'Kab. Gunungkidul', lat: -7.9628, lng: 110.6012 },
    ],
  },
  {
    name: 'Jawa Timur',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'jatim-surabaya', name: 'Kota Surabaya', lat: -7.2575, lng: 112.7521 },
      { id: 'jatim-malang-kota', name: 'Kota Malang', lat: -7.9666, lng: 112.6326 },
      { id: 'jatim-malang-kab', name: 'Kab. Malang', lat: -8.1332, lng: 112.5726 },
      { id: 'jatim-sidoarjo', name: 'Kab. Sidoarjo', lat: -7.4478, lng: 112.7183 },
      { id: 'jatim-gresik', name: 'Kab. Gresik', lat: -7.1566, lng: 112.6555 },
      { id: 'jatim-kediri-kota', name: 'Kota Kediri', lat: -7.8166, lng: 112.0114 },
      { id: 'jatim-madiun-kota', name: 'Kota Madiun', lat: -7.6298, lng: 111.5239 },
      { id: 'jatim-jember', name: 'Kab. Jember', lat: -8.1724, lng: 113.6995 },
      { id: 'jatim-banyuwangi', name: 'Kab. Banyuwangi', lat: -8.2192, lng: 114.3691 },
      { id: 'jatim-lamongan', name: 'Kab. Lamongan', lat: -7.1190, lng: 112.4162 },
      { id: 'jatim-jombang', name: 'Kab. Jombang', lat: -7.5460, lng: 112.2331 },
      { id: 'jatim-pasuruan-kota', name: 'Kota Pasuruan', lat: -7.6453, lng: 112.9075 },
      { id: 'jatim-probolinggo-kota', name: 'Kota Probolinggo', lat: -7.7543, lng: 113.2159 },
      { id: 'jatim-batu', name: 'Kota Batu', lat: -7.8671, lng: 112.5239 },
      { id: 'jatim-madura-bangkalan', name: 'Kab. Bangkalan', lat: -7.0455, lng: 112.7351 },
      { id: 'jatim-madura-pamekasan', name: 'Kab. Pamekasan', lat: -7.1568, lng: 113.4746 },
    ],
  },
  {
    name: 'Aceh',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'aceh-banda-aceh', name: 'Kota Banda Aceh', lat: 5.5483, lng: 95.3238 },
      { id: 'aceh-lhokseumawe', name: 'Kota Lhokseumawe', lat: 5.1801, lng: 97.1507 },
      { id: 'aceh-langsa', name: 'Kota Langsa', lat: 4.4683, lng: 97.9683 },
      { id: 'aceh-sabang', name: 'Kota Sabang', lat: 5.8947, lng: 95.3192 },
      { id: 'aceh-meulaboh', name: 'Kab. Aceh Barat (Meulaboh)', lat: 4.1419, lng: 96.1265 },
    ],
  },
  {
    name: 'Sumatera Utara',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'sumut-medan', name: 'Kota Medan', lat: 3.5952, lng: 98.6722 },
      { id: 'sumut-binjai', name: 'Kota Binjai', lat: 3.6001, lng: 98.4854 },
      { id: 'sumut-deliserdang', name: 'Kab. Deli Serdang', lat: 3.5547, lng: 98.8473 },
      { id: 'sumut-pematangsiantar', name: 'Kota Pematangsiantar', lat: 2.9595, lng: 99.0682 },
      { id: 'sumut-padangsidimpuan', name: 'Kota Padangsidimpuan', lat: 1.3788, lng: 99.2717 },
    ],
  },
  {
    name: 'Sumatera Barat',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'sumbar-padang', name: 'Kota Padang', lat: -0.9471, lng: 100.4172 },
      { id: 'sumbar-bukittinggi', name: 'Kota Bukittinggi', lat: -0.3056, lng: 100.3692 },
      { id: 'sumbar-payakumbuh', name: 'Kota Payakumbuh', lat: -0.2286, lng: 100.6334 },
      { id: 'sumbar-pariaman', name: 'Kota Pariaman', lat: -0.6264, lng: 100.1179 },
    ],
  },
  {
    name: 'Riau',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'riau-pekanbaru', name: 'Kota Pekanbaru', lat: 0.5071, lng: 101.4478 },
      { id: 'riau-dumai', name: 'Kota Dumai', lat: 1.6669, lng: 101.4478 },
      { id: 'riau-kampar', name: 'Kab. Kampar', lat: 0.3344, lng: 101.0226 },
      { id: 'riau-bengkalis', name: 'Kab. Bengkalis', lat: 1.4805, lng: 102.0858 },
    ],
  },
  {
    name: 'Kepulauan Riau',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'kepri-batam', name: 'Kota Batam', lat: 1.0456, lng: 104.0305 },
      { id: 'kepri-tanjungpinang', name: 'Kota Tanjungpinang', lat: 0.9186, lng: 104.4467 },
      { id: 'kepri-bintan', name: 'Kab. Bintan', lat: 1.0778, lng: 104.4962 },
    ],
  },
  {
    name: 'Jambi',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'jambi-kota', name: 'Kota Jambi', lat: -1.6101, lng: 103.6131 },
      { id: 'jambi-sungaipenuh', name: 'Kota Sungai Penuh', lat: -2.0638, lng: 101.3914 },
    ],
  },
  {
    name: 'Sumatera Selatan',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'sumsel-palembang', name: 'Kota Palembang', lat: -2.9761, lng: 104.7754 },
      { id: 'sumsel-prabumulih', name: 'Kota Prabumulih', lat: -3.4316, lng: 104.2306 },
      { id: 'sumsel-lubuklinggau', name: 'Kota Lubuklinggau', lat: -3.2966, lng: 102.8617 },
    ],
  },
  {
    name: 'Bengkulu',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'bengkulu-kota', name: 'Kota Bengkulu', lat: -3.7928, lng: 102.2608 },
      { id: 'bengkulu-rejang-lebong', name: 'Kab. Rejang Lebong', lat: -3.4673, lng: 102.5327 },
    ],
  },
  {
    name: 'Kepulauan Bangka Belitung',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'babel-pangkalpinang', name: 'Kota Pangkalpinang', lat: -2.1316, lng: 106.1169 },
      { id: 'babel-belitung', name: 'Kab. Belitung (Tanjung Pandan)', lat: -2.7410, lng: 107.6348 },
    ],
  },
  {
    name: 'Lampung',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'lampung-bandar-lampung', name: 'Kota Bandar Lampung', lat: -5.3971, lng: 105.2668 },
      { id: 'lampung-metro', name: 'Kota Metro', lat: -5.1131, lng: 105.3067 },
      { id: 'lampung-selatan', name: 'Kab. Lampung Selatan', lat: -5.7274, lng: 105.5973 },
    ],
  },
  {
    name: 'Kalimantan Barat',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'kalbar-pontianak', name: 'Kota Pontianak', lat: -0.0263, lng: 109.3425 },
      { id: 'kalbar-singkawang', name: 'Kota Singkawang', lat: 0.9073, lng: 108.9872 },
      { id: 'kalbar-kuburaya', name: 'Kab. Kubu Raya', lat: -0.1471, lng: 109.3895 },
    ],
  },
  {
    name: 'Kalimantan Tengah',
    timezone: 'Asia/Jakarta',
    tzLabel: 'WIB',
    cities: [
      { id: 'kalteng-palangkaraya', name: 'Kota Palangka Raya', lat: -2.2136, lng: 113.9108 },
      { id: 'kalteng-kotim', name: 'Kab. Kotawaringin Timur (Sampit)', lat: -2.5356, lng: 112.9567 },
      { id: 'kalteng-kobar', name: 'Kab. Kotawaringin Barat (Pangkalan Bun)', lat: -2.6833, lng: 111.6167 },
    ],
  },
  {
    name: 'Kalimantan Selatan',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'kalsel-banjarmasin', name: 'Kota Banjarmasin', lat: -3.3194, lng: 114.5908 },
      { id: 'kalsel-banjarbaru', name: 'Kota Banjarbaru', lat: -3.4426, lng: 114.8321 },
      { id: 'kalsel-banjar-martapura', name: 'Kab. Banjar (Martapura)', lat: -3.4108, lng: 114.8452 },
    ],
  },
  {
    name: 'Kalimantan Timur',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'kaltim-samarinda', name: 'Kota Samarinda', lat: -0.5022, lng: 117.1536 },
      { id: 'kaltim-balikpapan', name: 'Kota Balikpapan', lat: -1.2379, lng: 116.8529 },
      { id: 'kaltim-bontang', name: 'Kota Bontang', lat: 0.1336, lng: 117.4858 },
      { id: 'kaltim-ikn-paser', name: 'Kab. Penajam Paser Utara (IKN)', lat: -0.9679, lng: 116.7097 },
    ],
  },
  {
    name: 'Kalimantan Utara',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'kaltara-tarakan', name: 'Kota Tarakan', lat: 3.3000, lng: 117.6333 },
      { id: 'kaltara-bulungan', name: 'Kab. Bulungan (Tanjung Selor)', lat: 2.8375, lng: 117.3653 },
    ],
  },
  {
    name: 'Bali',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'bali-denpasar', name: 'Kota Denpasar', lat: -8.6705, lng: 115.2126 },
      { id: 'bali-badung', name: 'Kab. Badung', lat: -8.5819, lng: 115.1771 },
      { id: 'bali-buleleng', name: 'Kab. Buleleng (Singaraja)', lat: -8.1120, lng: 115.0882 },
    ],
  },
  {
    name: 'Nusa Tenggara Barat',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'ntb-mataram', name: 'Kota Mataram', lat: -8.5833, lng: 116.1167 },
      { id: 'ntb-bima', name: 'Kota Bima', lat: -8.4606, lng: 118.7267 },
      { id: 'ntb-lombok-tengah', name: 'Kab. Lombok Tengah', lat: -8.7056, lng: 116.2719 },
    ],
  },
  {
    name: 'Nusa Tenggara Timur',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'ntt-kupang', name: 'Kota Kupang', lat: -10.1772, lng: 123.6070 },
      { id: 'ntt-manggarai-barat', name: 'Kab. Manggarai Barat (Labuan Bajo)', lat: -8.4964, lng: 119.8877 },
    ],
  },
  {
    name: 'Sulawesi Selatan',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'sulsel-makassar', name: 'Kota Makassar', lat: -5.1477, lng: 119.4327 },
      { id: 'sulsel-parepare', name: 'Kota Parepare', lat: -4.0135, lng: 119.6255 },
      { id: 'sulsel-palopo', name: 'Kota Palopo', lat: -2.9926, lng: 120.1969 },
      { id: 'sulsel-gowa', name: 'Kab. Gowa', lat: -5.2041, lng: 119.4543 },
    ],
  },
  {
    name: 'Sulawesi Tengah',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'sulteng-palu', name: 'Kota Palu', lat: -0.8917, lng: 119.8707 },
      { id: 'sulteng-luwuk', name: 'Kab. Banggai (Luwuk)', lat: -0.9516, lng: 122.7875 },
    ],
  },
  {
    name: 'Sulawesi Tenggara',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'sultra-kendari', name: 'Kota Kendari', lat: -3.9985, lng: 122.5130 },
      { id: 'sultra-baubau', name: 'Kota Baubau', lat: -5.4633, lng: 122.6019 },
    ],
  },
  {
    name: 'Sulawesi Barat',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'sulbar-mamuju', name: 'Kab. Mamuju', lat: -2.6776, lng: 118.8872 },
      { id: 'sulbar-majene', name: 'Kab. Majene', lat: -3.5403, lng: 118.9707 },
    ],
  },
  {
    name: 'Gorontalo',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'gorontalo-kota', name: 'Kota Gorontalo', lat: 0.5435, lng: 123.0568 },
      { id: 'gorontalo-kab', name: 'Kab. Gorontalo', lat: 0.6254, lng: 122.9806 },
    ],
  },
  {
    name: 'Sulawesi Utara',
    timezone: 'Asia/Makassar',
    tzLabel: 'WITA',
    cities: [
      { id: 'sulut-manado', name: 'Kota Manado', lat: 1.4748, lng: 124.8421 },
      { id: 'sulut-bitung', name: 'Kota Bitung', lat: 1.4451, lng: 125.1824 },
      { id: 'sulut-kotamobagu', name: 'Kota Kotamobagu', lat: 0.7286, lng: 124.3122 },
    ],
  },
  {
    name: 'Maluku',
    timezone: 'Asia/Jayapura',
    tzLabel: 'WIT',
    cities: [
      { id: 'maluku-ambon', name: 'Kota Ambon', lat: -3.6954, lng: 128.1814 },
      { id: 'maluku-tual', name: 'Kota Tual', lat: -5.6305, lng: 132.7483 },
    ],
  },
  {
    name: 'Maluku Utara',
    timezone: 'Asia/Jayapura',
    tzLabel: 'WIT',
    cities: [
      { id: 'malut-ternate', name: 'Kota Ternate', lat: 0.7907, lng: 127.3842 },
      { id: 'malut-tidore', name: 'Kota Tidore Kepulauan', lat: 0.6819, lng: 127.4022 },
    ],
  },
  {
    name: 'Papua',
    timezone: 'Asia/Jayapura',
    tzLabel: 'WIT',
    cities: [
      { id: 'papua-jayapura', name: 'Kota Jayapura', lat: -2.5337, lng: 140.7181 },
      { id: 'papua-biak', name: 'Kab. Biak Numfor', lat: -1.1767, lng: 136.0820 },
    ],
  },
  {
    name: 'Papua Barat',
    timezone: 'Asia/Jayapura',
    tzLabel: 'WIT',
    cities: [
      { id: 'papbar-manokwari', name: 'Kab. Manokwari', lat: -0.8615, lng: 134.0620 },
      { id: 'papbar-fakfak', name: 'Kab. Fakfak', lat: -2.9264, lng: 132.2961 },
    ],
  },
  {
    name: 'Papua Barat Daya',
    timezone: 'Asia/Jayapura',
    tzLabel: 'WIT',
    cities: [
      { id: 'pbd-sorong', name: 'Kota Sorong', lat: -0.8762, lng: 131.2558 },
    ],
  },
  {
    name: 'Papua Selatan',
    timezone: 'Asia/Jayapura',
    tzLabel: 'WIT',
    cities: [
      { id: 'papsel-merauke', name: 'Kab. Merauke', lat: -8.4932, lng: 140.4018 },
    ],
  },
  {
    name: 'Papua Tengah',
    timezone: 'Asia/Jayapura',
    tzLabel: 'WIT',
    cities: [
      { id: 'papteng-mimika', name: 'Kab. Mimika (Timika)', lat: -4.5446, lng: 136.8886 },
      { id: 'papteng-nabire', name: 'Kab. Nabire', lat: -3.3667, lng: 135.4833 },
    ],
  },
  {
    name: 'Papua Pegunungan',
    timezone: 'Asia/Jayapura',
    tzLabel: 'WIT',
    cities: [
      { id: 'pappeg-jayawijaya', name: 'Kab. Jayawijaya (Wamena)', lat: -4.0931, lng: 138.9516 },
    ],
  },
]

// Flattened list semua Kabupaten/Kota
export const ALL_INDONESIA_CITIES: RegencyCity[] = INDONESIA_PROVINCES_RAW.flatMap((prov) =>
  prov.cities.map((c) => ({
    ...c,
    province: prov.name,
    timezone: prov.timezone,
    tzLabel: prov.tzLabel,
  }))
)

export function getCitiesByProvince(provinceName: string): RegencyCity[] {
  return ALL_INDONESIA_CITIES.filter((c) => c.province === provinceName)
}

// Haversine formula untuk mencari Kabupaten/Kota terdekat dari koordinat GPS
export function findNearestRegency(lat: number, lng: number): RegencyCity {
  let nearest = DEFAULT_LOCATION
  let minDist = Infinity

  const toRad = (v: number) => (v * Math.PI) / 180

  for (const city of ALL_INDONESIA_CITIES) {
    const dLat = toRad(city.lat - lat)
    const dLng = toRad(city.lng - lng)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) * Math.cos(toRad(city.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distKm = 6371 * c

    if (distKm < minDist) {
      minDist = distKm
      nearest = city
    }
  }

  // Jika jaraknya di luar Indonesia (> 1000 km dari titik kota terdekat), kembali ke checkpoint Karawang
  if (minDist > 1000) {
    return DEFAULT_LOCATION
  }

  return nearest
}

// Ambil jadwal sholat berdasarkan koordinat wilayah (Metode 20 = Kemenag RI)
export async function getPrayerTimesByLocation(
  location: RegencyCity = DEFAULT_LOCATION,
  date?: Date
): Promise<PrayerTimesResponse> {
  const targetDate = date || new Date()
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: location.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const parts = formatter.formatToParts(targetDate)
  const day = parts.find((p) => p.type === 'day')?.value || String(targetDate.getDate())
  const month = parts.find((p) => p.type === 'month')?.value || String(targetDate.getMonth() + 1)
  const year = parts.find((p) => p.type === 'year')?.value || String(targetDate.getFullYear())

  const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${location.lat}&longitude=${location.lng}&method=20&school=0`

  const res = await fetch(url, {
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('Gagal mengambil data waktu sholat')
  }

  const json: PrayerTimesResponse = await res.json()

  // Bersihkan suffix zona waktu seperti "04:35 (WIB)" menjadi "04:35"
  if (json?.data?.timings) {
    const cleanTimings = { ...json.data.timings }
    ;(Object.keys(cleanTimings) as (keyof PrayerTimes)[]).forEach((k) => {
      if (typeof cleanTimings[k] === 'string') {
        cleanTimings[k] = cleanTimings[k].split(' ')[0]
      }
    })
    json.data.timings = cleanTimings
  }

  return json
}

// Backward-compatible wrapper (default Karawang)
export async function getPrayerTimes(date?: Date): Promise<PrayerTimesResponse> {
  return getPrayerTimesByLocation(DEFAULT_LOCATION, date)
}

export const PRAYER_NAMES: Record<string, string> = {
  Imsak: 'Imsak',
  Fajr: 'Subuh',
  Sunrise: 'Syuruk',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
}

export const PRAYER_ICONS_MAP: Record<string, string> = {
  Imsak: '🌌',
  Fajr: '🌙',
  Sunrise: '🌅',
  Dhuhr: '☀️',
  Asr: '🌤️',
  Maghrib: '🌇',
  Isha: '🕌',
}

export const PRAYER_ORDER = ['Imsak', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

export function getCurrentHourMinuteInTz(timezone: TimezoneID = 'Asia/Jakarta'): {
  hours: number
  minutes: number
  seconds: number
} {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const hours = Number(parts.find((p) => p.type === 'hour')?.value || 0)
  const minutes = Number(parts.find((p) => p.type === 'minute')?.value || 0)
  const seconds = Number(parts.find((p) => p.type === 'second')?.value || 0)
  return { hours, minutes, seconds }
}

export function getNextPrayer(
  timings: PrayerTimes,
  timezone: TimezoneID = 'Asia/Jakarta'
): { name: string; time: string; label: string } | null {
  const { hours: curH, minutes: curM } = getCurrentHourMinuteInTz(timezone)
  const currentTime = curH * 60 + curM

  for (const prayer of PRAYER_ORDER) {
    const timeStr = timings[prayer as keyof PrayerTimes]
    if (!timeStr) continue

    const cleanStr = timeStr.split(' ')[0]
    const [hours, minutes] = cleanStr.split(':').map(Number)
    const prayerTime = hours * 60 + minutes

    if (prayerTime > currentTime) {
      return { name: prayer, time: cleanStr, label: PRAYER_NAMES[prayer] }
    }
  }

  // Semua sholat sudah lewat, kembali ke Imsak/Subuh besok
  return {
    name: 'Fajr',
    time: timings.Fajr.split(' ')[0],
    label: 'Subuh (Besok)',
  }
}

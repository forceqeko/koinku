import { Icon as IconifyIcon } from '@iconify/react';
import React from 'react';

export type IconType = React.ComponentType<any>;

// Helper to create a React component wrapping the Iconify Icon.
// We use OpenMoji prefix to get the premium outlined flat color style.
const createIcon = (name: string): IconType => {
  return (props: any) => React.createElement(IconifyIcon, { icon: name, ...props });
};

export interface IconOption {
  name: string;
  label: string;
  icon: IconType;
}

export const PURPOSE_ICONS: { category: string; icons: IconOption[] }[] = [
  {
    category: 'Makanan & Minuman',
    icons: [
      { name: 'ForkKnife', label: 'Makanan Berat', icon: createIcon('openmoji:fork-and-knife-with-plate') },
      { name: 'Coffee', label: 'Kopi & Jajanan', icon: createIcon('openmoji:hot-beverage') },
      { name: 'Hamburger', label: 'Fast Food', icon: createIcon('openmoji:hamburger') },
      { name: 'IceCream', label: 'Dessert', icon: createIcon('openmoji:ice-cream') },
      { name: 'BeerBottle', label: 'Minuman / Bar', icon: createIcon('openmoji:beer-mug') },
    ]
  },
  {
    category: 'Transportasi & Perjalanan',
    icons: [
      { name: 'Car', label: 'Mobil', icon: createIcon('openmoji:automobile') },
      { name: 'Motorcycle', label: 'Motor', icon: createIcon('openmoji:motorcycle') },
      { name: 'GasPump', label: 'Bensin / BBM', icon: createIcon('openmoji:fuel-pump') },
      { name: 'Train', label: 'Kendaraan Umum', icon: createIcon('openmoji:train') },
      { name: 'Airplane', label: 'Pesawat / Liburan', icon: createIcon('openmoji:airplane') },
      { name: 'MapPin', label: 'Lokasi / Hotel', icon: createIcon('openmoji:round-pushpin') },
      { name: 'RoadHorizon', label: 'Tol / Jalan', icon: createIcon('openmoji:motorway') },
    ]
  },
  {
    category: 'Belanja & Kebutuhan',
    icons: [
      { name: 'ShoppingBag', label: 'Belanja Umum', icon: createIcon('openmoji:shopping-bags') },
      { name: 'ShoppingCart', label: 'Supermarket', icon: createIcon('openmoji:shopping-cart') },
      { name: 'TShirt', label: 'Pakaian / Fashion', icon: createIcon('openmoji:t-shirt') },
      { name: 'DeviceMobile', label: 'Gadget / HP', icon: createIcon('openmoji:mobile-phone') },
      { name: 'Briefcase', label: 'Pekerjaan / Kantor', icon: createIcon('openmoji:briefcase') },
      { name: 'PawPrint', label: 'Kebutuhan Pet', icon: createIcon('openmoji:dog-face') },
      { name: 'Sparkle', label: 'Skincare / Sunscreen', icon: createIcon('openmoji:lotion-bottle') },
      { name: 'Lipstick', label: 'Kosmetik / Makeup', icon: createIcon('openmoji:lipstick') },
      { name: 'Soap', label: 'Sabun / Facial Wash', icon: createIcon('openmoji:soap') },
      { name: 'Mirror', label: 'Cermin / Kecantikan', icon: createIcon('openmoji:mirror') },
      { name: 'Scissors', label: 'Potong Rambut / Salon', icon: createIcon('openmoji:scissors') },
      { name: 'Flower', label: 'Treatment / Salon / Spa', icon: createIcon('openmoji:blossom') },
    ]
  },
  {
    category: 'Rumah & Keluarga',
    icons: [
      { name: 'House', label: 'Kost / Rumah', icon: createIcon('openmoji:house') },
      { name: 'WashingMachine', label: 'Laundry / Bersih', icon: createIcon('openmoji:washing-machine') },
      { name: 'Baby', label: 'Kebutuhan Bayi', icon: createIcon('openmoji:baby-bottle') },
      { name: 'Users', label: 'Sosial / Keluarga', icon: createIcon('openmoji:family') },
      { name: 'Gift', label: 'Kado / Hadiah', icon: createIcon('openmoji:wrapped-gift') },
    ]
  },
  {
    category: 'Tagihan & Utilitas',
    icons: [
      { name: 'Lightning', label: 'Listrik / Token', icon: createIcon('openmoji:high-voltage') },
      { name: 'Drop', label: 'Air PDAM', icon: createIcon('openmoji:droplet') },
      { name: 'WifiHigh', label: 'Internet / Pulsa', icon: createIcon('openmoji:antenna-bars') },
      { name: 'Television', label: 'Streaming / TV', icon: createIcon('openmoji:television') },
      { name: 'CreditCard', label: 'Biaya Admin / Bank', icon: createIcon('openmoji:credit-card') },
      { name: 'Shield', label: 'VPN / Keamanan', icon: createIcon('openmoji:shield') },
      { name: 'Brain', label: 'AI / Langganan AI', icon: createIcon('openmoji:brain') },
      { name: 'Receipt', label: 'Iuran / Retribusi', icon: createIcon('openmoji:receipt') },
    ]
  },
  {
    category: 'Hiburan & Hobi',
    icons: [
      { name: 'GameController', label: 'Gaming / Game', icon: createIcon('openmoji:video-game') },
      { name: 'Ticket', label: 'Bioskop / Konser', icon: createIcon('openmoji:admission-tickets') },
      { name: 'BookOpen', label: 'Buku / Edukasi', icon: createIcon('openmoji:open-book') },
      { name: 'Barbell', label: 'Gym / Olahraga', icon: createIcon('openmoji:person-lifting-weights') },
      { name: 'MusicNotes', label: 'Musik', icon: createIcon('openmoji:musical-notes') },
      { name: 'Presentation', label: 'Pelatihan / Kursus', icon: createIcon('openmoji:graduation-cap') },
      { name: 'Camera', label: 'Fotografi / Kamera', icon: createIcon('openmoji:camera') },
      { name: 'SoccerBall', label: 'Futsal / Bola', icon: createIcon('openmoji:soccer-ball') },
      { name: 'Bicycle', label: 'Sepeda / Gowes', icon: createIcon('openmoji:bicycle') },
      { name: 'Microphone', label: 'Karaoke / Menyanyi', icon: createIcon('openmoji:microphone') },
      { name: 'Palette', label: 'Seni / Kriya / Lukis', icon: createIcon('openmoji:artist-palette') },
      { name: 'Plant', label: 'Berkebun / Tanaman', icon: createIcon('openmoji:potted-plant') },
    ]
  },
  {
    category: 'Kesehatan & Sosial',
    icons: [
      { name: 'Heartbeat', label: 'Kesehatan / Medis', icon: createIcon('openmoji:red-heart') },
      { name: 'Hospital', label: 'Hospital / Klinik', icon: createIcon('openmoji:hospital') },
      { name: 'Pill', label: 'Obat-obatan', icon: createIcon('openmoji:pill') },
      { name: 'HandHeart', label: 'Sedekah / Amal', icon: createIcon('openmoji:handshake') },
      { name: 'HandCoins', label: 'Zakat / Fitrah', icon: createIcon('openmoji:money-bag') },
      { name: 'Cow', label: 'Qurban / Hewan Ternak', icon: createIcon('openmoji:cow-face') },
      { name: 'Heart', label: 'Donasi', icon: createIcon('openmoji:sparkling-heart') },
    ]
  },
  {
    category: 'Keuangan & Lainnya',
    icons: [
      { name: 'Coins', label: 'Tabungan', icon: createIcon('openmoji:coin') },
      { name: 'TrendUp', label: 'Investasi / Untung', icon: createIcon('openmoji:chart-increasing') },
      { name: 'TrendDown', label: 'Kerugian / Minus', icon: createIcon('openmoji:chart-decreasing') },
      { name: 'Scales', label: 'Selisih / Penyesuaian', icon: createIcon('openmoji:balance-scale') },
      { name: 'UserGear', label: 'Biaya Admin', icon: createIcon('openmoji:gear') },
      { name: 'Question', label: 'Lain-lain', icon: createIcon('openmoji:white-question-mark') },
    ]
  }
];

export const getPurposeIcon = (name: string | null | undefined): IconType => {
  if (!name) return createIcon('openmoji:white-question-mark');
  for (const group of PURPOSE_ICONS) {
    const found = group.icons.find(i => i.name === name);
    if (found) return found.icon;
  }
  return createIcon('openmoji:white-question-mark');
};

export const getCategoryColor = (name: string | null | undefined): string => {
  if (!name) return 'bg-surface-alt border-line text-text-secondary';
  
  let categoryName = '';
  for (const group of PURPOSE_ICONS) {
    const found = group.icons.find(i => i.name === name);
    if (found) {
      categoryName = group.category;
      break;
    }
  }
  
  switch (categoryName) {
    case 'Makanan & Minuman':
      return 'bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/30 text-red-600';
    case 'Transportasi & Perjalanan':
      return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/30 text-blue-600';
    case 'Belanja & Kebutuhan':
      return 'bg-pink-50 dark:bg-pink-950/20 border-pink-200/50 dark:border-pink-900/30 text-pink-600';
    case 'Rumah & Keluarga':
      return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-900/30 text-orange-600';
    case 'Tagihan & Utilitas':
      return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200/50 dark:border-yellow-900/30 text-yellow-600';
    case 'Hiburan & Hobi':
      return 'bg-purple-50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-900/30 text-purple-600';
    case 'Kesehatan & Sosial':
      return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600';
    case 'Keuangan & Lainnya':
      return 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30 text-indigo-600';
    default:
      return 'bg-surface-alt border-line text-text-secondary';
  }
};

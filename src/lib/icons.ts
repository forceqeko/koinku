import {
  ForkKnife,
  Coffee,
  Hamburger,
  IceCream,
  BeerBottle,
  Car,
  Motorcycle,
  GasPump,
  Train,
  Airplane,
  MapPin,
  RoadHorizon,
  ShoppingBag,
  ShoppingCart,
  TShirt,
  DeviceMobile,
  Briefcase,
  PawPrint,
  Sparkle,
  House,
  WashingMachine,
  Baby,
  Users,
  Gift,
  Lightning,
  Drop,
  WifiHigh,
  Television,
  CreditCard,
  Shield,
  GameController,
  Ticket,
  BookOpen,
  Barbell,
  MusicNotes,
  Presentation,
  Heartbeat,
  Pill,
  HandHeart,
  HandCoins,
  Heart,
  Coins,
  TrendUp,
  TrendDown,
  Scales,
  Brain,
  Cow,
  Receipt,
  UserGear,
  Flower,
  Question,
  type Icon
} from '@phosphor-icons/react';

export interface IconOption {
  name: string;
  label: string;
  icon: Icon;
}

export const PURPOSE_ICONS: { category: string; icons: IconOption[] }[] = [
  {
    category: 'Makanan & Minuman',
    icons: [
      { name: 'ForkKnife', label: 'Makanan Berat', icon: ForkKnife },
      { name: 'Coffee', label: 'Kopi & Jajanan', icon: Coffee },
      { name: 'Hamburger', label: 'Fast Food', icon: Hamburger },
      { name: 'IceCream', label: 'Dessert', icon: IceCream },
      { name: 'BeerBottle', label: 'Minuman / Bar', icon: BeerBottle },
    ]
  },
  {
    category: 'Transportasi & Perjalanan',
    icons: [
      { name: 'Car', label: 'Mobil', icon: Car },
      { name: 'Motorcycle', label: 'Motor', icon: Motorcycle },
      { name: 'GasPump', label: 'Bensin / BBM', icon: GasPump },
      { name: 'Train', label: 'Kendaraan Umum', icon: Train },
      { name: 'Airplane', label: 'Pesawat / Liburan', icon: Airplane },
      { name: 'MapPin', label: 'Lokasi / Hotel', icon: MapPin },
      { name: 'RoadHorizon', label: 'Tol / Jalan', icon: RoadHorizon },
    ]
  },
  {
    category: 'Belanja & Kebutuhan',
    icons: [
      { name: 'ShoppingBag', label: 'Belanja Umum', icon: ShoppingBag },
      { name: 'ShoppingCart', label: 'Supermarket', icon: ShoppingCart },
      { name: 'TShirt', label: 'Pakaian / Fashion', icon: TShirt },
      { name: 'DeviceMobile', label: 'Gadget / HP', icon: DeviceMobile },
      { name: 'Briefcase', label: 'Pekerjaan / Kantor', icon: Briefcase },
      { name: 'PawPrint', label: 'Kebutuhan Pet', icon: PawPrint },
      { name: 'Sparkle', label: 'Skincare / Kosmetik', icon: Sparkle },
      { name: 'Flower', label: 'Treatment / Salon / Spa', icon: Flower },
    ]
  },
  {
    category: 'Rumah & Keluarga',
    icons: [
      { name: 'House', label: 'Kost / Rumah', icon: House },
      { name: 'WashingMachine', label: 'Laundry / Bersih', icon: WashingMachine },
      { name: 'Baby', label: 'Kebutuhan Bayi', icon: Baby },
      { name: 'Users', label: 'Sosial / Keluarga', icon: Users },
      { name: 'Gift', label: 'Kado / Hadiah', icon: Gift },
    ]
  },
  {
    category: 'Tagihan & Utilitas',
    icons: [
      { name: 'Lightning', label: 'Listrik / Token', icon: Lightning },
      { name: 'Drop', label: 'Air PDAM', icon: Drop },
      { name: 'WifiHigh', label: 'Internet / Pulsa', icon: WifiHigh },
      { name: 'Television', label: 'Streaming / TV', icon: Television },
      { name: 'CreditCard', label: 'Biaya Admin / Bank', icon: CreditCard },
      { name: 'Shield', label: 'VPN / Keamanan', icon: Shield },
      { name: 'Brain', label: 'AI / Langganan AI', icon: Brain },
      { name: 'Receipt', label: 'Iuran / Retribusi', icon: Receipt },
    ]
  },
  {
    category: 'Hiburan & Hobi',
    icons: [
      { name: 'GameController', label: 'Gaming / Game', icon: GameController },
      { name: 'Ticket', label: 'Bioskop / Konser', icon: Ticket },
      { name: 'BookOpen', label: 'Buku / Edukasi', icon: BookOpen },
      { name: 'Barbell', label: 'Gym / Olahraga', icon: Barbell },
      { name: 'MusicNotes', label: 'Musik', icon: MusicNotes },
      { name: 'Presentation', label: 'Pelatihan / Kursus', icon: Presentation },
    ]
  },
  {
    category: 'Kesehatan & Sosial',
    icons: [
      { name: 'Heartbeat', label: 'Kesehatan / Medis', icon: Heartbeat },
      { name: 'Pill', label: 'Obat-obatan', icon: Pill },
      { name: 'HandHeart', label: 'Sedekah / Amal', icon: HandHeart },
      { name: 'HandCoins', label: 'Zakat / Fitrah', icon: HandCoins },
      { name: 'Cow', label: 'Qurban / Hewan Ternak', icon: Cow },
      { name: 'Heart', label: 'Donasi', icon: Heart },
    ]
  },
  {
    category: 'Keuangan & Lainnya',
    icons: [
      { name: 'Coins', label: 'Tabungan', icon: Coins },
      { name: 'TrendUp', label: 'Investasi / Untung', icon: TrendUp },
      { name: 'TrendDown', label: 'Kerugian / Minus', icon: TrendDown },
      { name: 'Scales', label: 'Selisih / Penyesuaian', icon: Scales },
      { name: 'UserGear', label: 'Biaya Admin', icon: UserGear },
      { name: 'Question', label: 'Lain-lain', icon: Question },
    ]
  }
];

export const getPurposeIcon = (name: string | null | undefined): Icon => {
  if (!name) return Question;
  for (const group of PURPOSE_ICONS) {
    const found = group.icons.find(i => i.name === name);
    if (found) return found.icon;
  }
  return Question;
};

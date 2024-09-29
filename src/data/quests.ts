export interface SocialChannel {
  id: string;
  name: string;
  url: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  articleUrl?: string;
  rewardPoints: number;
  isPrerequisite?: boolean;
  socialChannel?: SocialChannel;
}

export const socialChannels: SocialChannel[] = [
  {
    id: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com/icryptomedia/",
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com/@icryptomedia",
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/icryptomedia",
  },
];

export const quests: Quest[] = [
  {
    id: "follow-instagram",
    title: "Follow iCrypto Media on Instagram",
    description: "Follow our Instagram channel for the latest updates.",
    rewardPoints: 5,
    isPrerequisite: true,
    socialChannel: socialChannels[0],
  },
  {
    id: "follow-tiktok",
    title: "Follow iCrypto Media on TikTok",
    description: "Join us on TikTok for short, informative crypto content.",
    rewardPoints: 5,
    isPrerequisite: true,
    socialChannel: socialChannels[1],
  },
  {
    id: "subscribe-youtube",
    title: "Subscribe to iCrypto Media on YouTube",
    description:
      "Subscribe to our YouTube channel for in-depth crypto analysis.",
    rewardPoints: 5,
    isPrerequisite: true,
    socialChannel: socialChannels[2],
  },
  {
    id: "xrp-prediction",
    title: "Quest 1: Baca Prediksi Harga XRP",
    description:
      "Baca artikel tentang prediksi harga XRP dan berikan pendapatmu.",
    articleUrl: "https://icrypto.co.id/xrp-prediksi-ledakan-harga-2024/",
    rewardPoints: 10,
  },
  {
    id: "coinbase-vs-sec",
    title: "Quest 2: Baca Coinbase vs SEC",
    description: "Baca artikel tentang Coinbase vs SEC dan berikan pendapatmu.",
    articleUrl: "https://icrypto.co.id/coinbase-vs-sec-regulasi-kripto/",
    rewardPoints: 50,
  },
  // Add more quests here in the future
];

export interface SocialChannel {
  id: string;
  name: string;
  url: string;
}

export interface TokenReward {
  tokenId: number;
  points: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  articleUrl?: string;
  tokenRewards: TokenReward[];
  isPrerequisite?: boolean;
  socialChannel?: SocialChannel;
  type: "social" | "article" | "custom";
  requiresFeedback: boolean;
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
    tokenRewards: [{ tokenId: 1, points: 5 }],
    isPrerequisite: true,
    socialChannel: socialChannels[0],
    type: "social",
    requiresFeedback: false,
  },
  {
    id: "follow-tiktok",
    title: "Follow iCrypto Media on TikTok",
    description: "Join us on TikTok for short, informative crypto content.",
    tokenRewards: [{ tokenId: 1, points: 5 }],
    isPrerequisite: true,
    socialChannel: socialChannels[1],
    type: "social",
    requiresFeedback: false,
  },
  {
    id: "subscribe-youtube",
    title: "Subscribe to iCrypto Media on YouTube",
    description: "Subscribe to our YouTube channel for in-depth crypto analysis.",
    tokenRewards: [{ tokenId: 1, points: 5 }],
    isPrerequisite: true,
    socialChannel: socialChannels[2],
    type: "social",
    requiresFeedback: false,
  },
  {
    id: "xrp-prediction",
    title: "Quest 1: Baca belajar web3 dan coinbase wallet",
    description: "Baca artikel tentang belajar web3 dan coinbase wallet",
    articleUrl:
      ":https://icrypto.co.id/icrypto-media-academy-mini-app-belajar-web3-dan-coinbase-wallet/",
    tokenRewards: [{ tokenId: 1, points: 20 }],
    type: "article",
    requiresFeedback: true,
  },
  // Add more quests here in the future
];

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
  id: number;
  seasonId: number; // Add this field
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
  {
    id: "spotify",
    name: "Spotify",
    url: "https://open.spotify.com/show/76riuIIyeR0DdKQgBxOmO3",
  },
];

export const quests: Quest[] = [
  {
    id: 1,
    seasonId: 1, // Add this field to each quest
    title: "Follow iCrypto Media on Instagram",
    description: "Follow our Instagram channel for the latest updates.",
    tokenRewards: [{ tokenId: 1, points: 5 }],
    isPrerequisite: true,
    socialChannel: socialChannels[0],
    type: "social",
    requiresFeedback: false,
  },
  {
    id: 2,
    seasonId: 1, // Add this field to each quest
    title: "Follow iCrypto Media on TikTok",
    description: "Join us on TikTok for short, informative crypto content.",
    tokenRewards: [{ tokenId: 1, points: 5 }],
    isPrerequisite: true,
    socialChannel: socialChannels[1],
    type: "social",
    requiresFeedback: false,
  },
  {
    id: 3,
    seasonId: 1, // Add this field to each quest
    title: "Subscribe to iCrypto Media on YouTube",
    description: "Subscribe to our YouTube channel for in-depth crypto analysis.",
    tokenRewards: [{ tokenId: 1, points: 5 }],
    isPrerequisite: true,
    socialChannel: socialChannels[2],
    type: "social",
    requiresFeedback: false,
  },
  {
    id: 4,
    seasonId: 1, // Add this field to each quest
    title: "Listen to Podcast iCrypto Media on Spotify",
    description: "Listen to our Spotify show for crypto insights.",
    tokenRewards: [{ tokenId: 1, points: 5 }],
    isPrerequisite: true,
    socialChannel: socialChannels[3],
    type: "social",
    requiresFeedback: false,
  },
  {
    id: 5,
    seasonId: 1, // Add this field to each quest
    title: "Quest 1: Baca belajar web3 dan coinbase wallet",
    description: "Baca artikel tentang belajar web3 dan coinbase wallet",
    articleUrl:
      "https://icrypto.co.id/icrypto-media-academy-mini-app-belajar-web3-dan-coinbase-wallet/",
    tokenRewards: [{ tokenId: 1, points: 20 }],
    type: "article",
    requiresFeedback: true,
  },
  // Add more quests here in the future
];

export const seasons = [
  { id: 1, name: "Season 1", startDate: "2024-10-01", endDate: "2024-10-31" },
  { id: 2, name: "Season 2", startDate: "2024-11-01", endDate: "2024-11-30" },
  // ... add more seasons as needed
];

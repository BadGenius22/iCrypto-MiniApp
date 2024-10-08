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
  title: string;
  description: string;
  articleUrl?: string;
  tokenRewards: TokenReward[];
  isPrerequisite?: boolean;
  socialChannel?: SocialChannel;
  type: "social" | "article" | "custom";
  requiresFeedback: boolean;
}

export interface Season {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  quests: number[]; // Array of quest IDs
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

export const seasons: Season[] = [
  {
    id: 1,
    name: "Season 1",
    startDate: "2024-10-01",
    endDate: "2024-10-31",
    quests: [1, 2, 3, 4, 5],
  },
  // ... more seasons
];

export const quests: Quest[] = [
  {
    id: 1,
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

export function getSeasonIdForQuest(questId: number): number | undefined {
  for (const season of seasons) {
    if (season.quests.includes(questId)) {
      return season.id;
    }
  }
  return undefined;
}

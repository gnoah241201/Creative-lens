export interface DemoCreative {
  id: string;
  width: number;
  height: number;
  ratio: string;
  duration: number;
  creativeCnt: number;
  cnt: number;
  imp: number;
  firstSeen: string;
  lastSeen: string;
  copy: string;
  videoUrl: string;
  thumbUrl: string;
  byNetwork: Record<string, { cnt: number; imp: number }>;
  geo: Record<string, Record<string, { cnt: number; imp: number }>>;
}

export interface DemoDataset {
  pkg: string;
  start: string;
  end: string;
  fetchedAt: number;
  networks: string[];
  networkIds: Record<string, number>;
  creatives: DemoCreative[];
}

export const sampleDataset: DemoDataset = {
  pkg: 'com.ig.screwdom',
  start: '2026-08-20',
  end: '2026-09-18',
  fetchedAt: Date.now() - 3600000,
  networks: ['TikTok Ads', 'Google Ads', 'Applovin', 'Unity', 'Facebook Ads'],
  networkIds: {
    'TikTok Ads': 109,
    'Google Ads': 105,
    'Applovin': 102,
    'Unity': 110,
    'Facebook Ads': 104,
  },
  creatives: [
    {
      id: 'cr_1001',
      width: 720,
      height: 1280,
      ratio: '9:16',
      duration: 29,
      creativeCnt: 14,
      cnt: 41560,
      imp: 1450000,
      firstSeen: '2026-08-25',
      lastSeen: '2026-09-17',
      copy: 'Only 1% of players can unscrew all the metal pins without dropping the plate! 🔩',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
      byNetwork: {
        'TikTok Ads': { cnt: 26500, imp: 950000 },
        'Google Ads': { cnt: 9800, imp: 320000 },
        'Applovin': { cnt: 5260, imp: 180000 },
      },
      geo: {
        'TikTok Ads': {
          JP: { cnt: 14500, imp: 520000 },
          US: { cnt: 7200, imp: 260000 },
          KR: { cnt: 4800, imp: 170000 },
        },
        'Google Ads': {
          US: { cnt: 5100, imp: 170000 },
          JP: { cnt: 2800, imp: 90000 },
          BR: { cnt: 1900, imp: 60000 },
        },
        'Applovin': {
          JP: { cnt: 3100, imp: 110000 },
          US: { cnt: 2160, imp: 70000 },
        },
        '*': {
          JP: { cnt: 20400, imp: 720000 },
          US: { cnt: 14460, imp: 500000 },
          KR: { cnt: 4800, imp: 170000 },
          BR: { cnt: 1900, imp: 60000 },
        },
      },
    },
    {
      id: 'cr_1002',
      width: 720,
      height: 1280,
      ratio: '9:16',
      duration: 15,
      creativeCnt: 8,
      cnt: 28400,
      imp: 890000,
      firstSeen: '2026-09-02',
      lastSeen: '2026-09-18',
      copy: 'Satisfying wooden nuts and bolts puzzle. Relaxing ASMR sound! 🎧',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80',
      byNetwork: {
        'TikTok Ads': { cnt: 18200, imp: 590000 },
        'Facebook Ads': { cnt: 6400, imp: 190000 },
        'Unity': { cnt: 3800, imp: 110000 },
      },
      geo: {
        'TikTok Ads': {
          JP: { cnt: 10200, imp: 340000 },
          KR: { cnt: 5100, imp: 160000 },
          TW: { cnt: 2900, imp: 90000 },
        },
        'Facebook Ads': {
          US: { cnt: 4200, imp: 120000 },
          DE: { cnt: 2200, imp: 70000 },
        },
        'Unity': {
          JP: { cnt: 2100, imp: 60000 },
          US: { cnt: 1700, imp: 50000 },
        },
        '*': {
          JP: { cnt: 12300, imp: 400000 },
          KR: { cnt: 5100, imp: 160000 },
          US: { cnt: 5900, imp: 170000 },
          TW: { cnt: 2900, imp: 90000 },
          DE: { cnt: 2200, imp: 70000 },
        },
      },
    },
    {
      id: 'cr_1003',
      width: 1280,
      height: 720,
      ratio: '16:9',
      duration: 45,
      creativeCnt: 4,
      cnt: 19300,
      imp: 620000,
      firstSeen: '2026-08-22',
      lastSeen: '2026-09-12',
      copy: 'IQ test: Can you clear level 50? Most fail on move 3!',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80',
      byNetwork: {
        'Google Ads': { cnt: 13500, imp: 430000 },
        'Applovin': { cnt: 5800, imp: 190000 },
      },
      geo: {
        'Google Ads': {
          US: { cnt: 7800, imp: 250000 },
          BR: { cnt: 3700, imp: 110000 },
          JP: { cnt: 2000, imp: 70000 },
        },
        'Applovin': {
          US: { cnt: 3400, imp: 110000 },
          JP: { cnt: 2400, imp: 80000 },
        },
        '*': {
          US: { cnt: 11200, imp: 360000 },
          BR: { cnt: 3700, imp: 110000 },
          JP: { cnt: 4400, imp: 150000 },
        },
      },
    },
    {
      id: 'cr_1004',
      width: 720,
      height: 720,
      ratio: '1:1',
      duration: 25,
      creativeCnt: 3,
      cnt: 12400,
      imp: 380000,
      firstSeen: '2026-09-08',
      lastSeen: '2026-09-18',
      copy: 'Challenging mechanical puzzle with realistic physics. Try now!',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      thumbUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=80',
      byNetwork: {
        'Facebook Ads': { cnt: 8200, imp: 260000 },
        'TikTok Ads': { cnt: 4200, imp: 120000 },
      },
      geo: {
        'Facebook Ads': {
          US: { cnt: 4900, imp: 160000 },
          UK: { cnt: 2100, imp: 65000 },
          CA: { cnt: 1200, imp: 35000 },
        },
        'TikTok Ads': {
          JP: { cnt: 2500, imp: 70000 },
          KR: { cnt: 1700, imp: 50000 },
        },
        '*': {
          US: { cnt: 4900, imp: 160000 },
          JP: { cnt: 2500, imp: 70000 },
          UK: { cnt: 2100, imp: 65000 },
          KR: { cnt: 1700, imp: 50000 },
          CA: { cnt: 1200, imp: 35000 },
        },
      },
    },
    {
      id: 'cr_1005',
      width: 720,
      height: 1280,
      ratio: '9:16',
      duration: 32,
      creativeCnt: 1,
      cnt: 8900,
      imp: 270000,
      firstSeen: '2026-09-14',
      lastSeen: '2026-09-18',
      copy: 'New Boss Level unlocked: The Titanium Lockbox 🔐 Can you open it?',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      thumbUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80',
      byNetwork: {
        'TikTok Ads': { cnt: 6400, imp: 200000 },
        'Unity': { cnt: 2500, imp: 70000 },
      },
      geo: {
        'TikTok Ads': {
          JP: { cnt: 3900, imp: 125000 },
          KR: { cnt: 2500, imp: 75000 },
        },
        'Unity': {
          JP: { cnt: 1400, imp: 40000 },
          US: { cnt: 1100, imp: 30000 },
        },
        '*': {
          JP: { cnt: 5300, imp: 165000 },
          KR: { cnt: 2500, imp: 75000 },
          US: { cnt: 1100, imp: 30000 },
        },
      },
    },
    {
      id: 'cr_1006',
      width: 720,
      height: 960,
      ratio: '3:4',
      duration: 18,
      creativeCnt: 2,
      cnt: 4600,
      imp: 140000,
      firstSeen: '2026-09-11',
      lastSeen: '2026-09-16',
      copy: 'Don\'t let the glass shatter! Unscrew in reverse order.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
      thumbUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&auto=format&fit=crop&q=80',
      byNetwork: {
        'Google Ads': { cnt: 3100, imp: 95000 },
        'Applovin': { cnt: 1500, imp: 45000 },
      },
      geo: {
        'Google Ads': {
          US: { cnt: 1900, imp: 60000 },
          BR: { cnt: 1200, imp: 35000 },
        },
        'Applovin': {
          JP: { cnt: 1000, imp: 30000 },
          US: { cnt: 500, imp: 15000 },
        },
        '*': {
          US: { cnt: 2400, imp: 75000 },
          BR: { cnt: 1200, imp: 35000 },
          JP: { cnt: 1000, imp: 30000 },
        },
      },
    },
  ],
};

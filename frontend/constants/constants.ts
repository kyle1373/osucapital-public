export const COOKIES = {
  userSession: "userSession",
};

export const COLORS = {
  PrimaryPink: "#BC5091",
  SecondaryPink: "#99377A",
};

export const LIMIT = {
  UpdateStockViewMinutes: 2,
  UpdateStockTradeMinutes: 0.05,
  SeasonOpenDate: "2024-05-10T16:00:00Z",
};

export const COINS = {
  StartingCoins: 10000,
  MaxCoins: 999999999, // This is also on the database. If you change this, be sure to change the database too
  BuyTax: 0.003,
  BannedSellPenalty: 0.5,
  TradingBonus: 10,
  MinimumSharePrice: 10,
};

export const SETTINGS = {
  Maintenance: false,
  SeasonClosed: false,
  CheckPPRebalanceOnStocks: true,
};

export const TEXT = {
  CurrentSeason: "May 2024 (5/10/2024 - ???)",
};

export const LINKS = {
  Discord: "https://discord.gg/JXPNGnME4w",
  OsuPrivacyPolicy: "https://osu.ppy.sh/legal/en/Privacy",
  OsuTermsOfService: "https://osu.ppy.sh/legal/en/Terms",
  OsuCapitalEmail: "osucapital@gmail.com",
};

export const STRIPE = {
  OsuCapitalSupporterPriceID: "price_1P9STeBZrEdrjkBGRg2ulhiy", // price_1P4aTzBZrEdrjkBG5fslb15J // Taken from https://dashboard.stripe.com/test/products/prod_PuPH2XYOIoSmUX
};

export const SEO_METADATA = {
  title: "osu! capital",
  description:
    "Use digital currency to invest into osu! players. Compete on the global rankings in a vibrant community full of rhythm-gaming investors!",
  image:
    "https://github-production-user-asset-6210df.s3.amazonaws.com/59634395/265977862-c4467abc-66f9-4f4d-9a1f-cc247b6d990c.png",
};

import { PRICES } from "./prices";

export const PICTURE_PACKAGES = [
  { id: "starter", name: "Starter", pictures: 5, priceUsd: PRICES.pictureStarter,
    use: "Give us a chance. Start with five.", days: 5,
    checkout: "https://buy.stripe.com/cNi8wO52y2os3O8aIK5AQ0n",
    productId: "prod_VODZAxdES5Hc4A", priceId: "price_1UNR7wBHH7tuNwAAIyiu5Dl1" },
  { id: "growth", name: "Growth", pictures: 12, priceUsd: PRICES.pictureGrowth,
    use: "Three fresh posts a week for four weeks.", days: 5,
    checkout: "https://buy.stripe.com/4gM5kC9iO2os4Sc4km5AQ0o",
    productId: "prod_VODZTz3rVqQt8x", priceId: "price_1UNR8CBHH7tuNwAArVyNVxV7" },
  { id: "daily", name: "Daily Presence", pictures: 30, priceUsd: PRICES.pictureDaily,
    use: "One picture a day for 30 days.", days: 10,
    checkout: "https://buy.stripe.com/9B6cN466C9QU3O87wy5AQ0p",
    productId: "prod_VODZd1b5PBtQBw", priceId: "price_1UNR8DBHH7tuNwAAbHkn7RA4" },
] as const;

export const PICTURE_BULK = {
  id: "bulk100", name: "100-Picture Bulk Pack", pictures: 100,
  priceUsd: PRICES.pictureBulk100,
  checkout: "https://buy.stripe.com/28E6oG1Qme7afwQ5oq5AQ0q",
  productId: "prod_VODbyqOBR4BNb6", priceId: "price_1UNRANBHH7tuNwAA3Mma4SO7",
} as const;

export const PICTURE_CONTENT_TYPES = [
  "Inventory spotlights", "Approved offers", "New arrivals", "Meet the team",
  "Customer deliveries", "Service reminders", "Seasonal promotions", "Brand and quote graphics",
] as const;

export const DAILY_PACK_QUANTITIES = [1, 2, 3, 4] as const;
export const DAILY_PACK_CHECKOUTS: Readonly<Record<number, string>> = {
  1: PICTURE_PACKAGES[2].checkout,
  2: "https://buy.stripe.com/28EbJ08eKbZ298s6su5AQ0r",
  3: "https://buy.stripe.com/8x200i8eKfbe70k4km5AQ0s",
  4: "https://buy.stripe.com/dRm28q52ye7afwQ5oq5AQ0t",
};
export const pictureUnitPrice = (priceUsd: number, pictures: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceUsd / pictures);

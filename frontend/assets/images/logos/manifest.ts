import { ImageSourcePropType } from 'react-native';

export type BrandLogoAsset = {
  source: ImageSourcePropType | null;
  filename: string;
};

// Metro requires static asset imports. Keep these entries null until you add the
// licensed PNG files, then replace null with require('./your-file.png').
export const LOGO_ASSETS: Record<string, BrandLogoAsset> = {
  doordash: { source: null, filename: 'doordash.png' },
  rover: { source: null, filename: 'rover.png' },
  biolife: { source: null, filename: 'biolife.png' },
  uber: { source: null, filename: 'uber.png' },
  'uber eats': { source: null, filename: 'uber-eats.png' },
  lyft: { source: null, filename: 'lyft.png' },
  instacart: { source: null, filename: 'instacart.png' },
  spark: { source: null, filename: 'spark.png' },
  grubhub: { source: null, filename: 'grubhub.png' },
  taskrabbit: { source: null, filename: 'taskrabbit.png' },
  turo: { source: null, filename: 'turo.png' },
  airbnb: { source: null, filename: 'airbnb.png' },
  wag: { source: null, filename: 'wag.png' },
  fiverr: { source: null, filename: 'fiverr.png' },
  upwork: { source: null, filename: 'upwork.png' },
  shopify: { source: null, filename: 'shopify.png' },
  etsy: { source: null, filename: 'etsy.png' },
  ebay: { source: null, filename: 'ebay.png' },
  poshmark: { source: null, filename: 'poshmark.png' },
  mercari: { source: null, filename: 'mercari.png' },
  amazon: { source: null, filename: 'amazon.png' },
  youtube: { source: null, filename: 'youtube.png' },
  tiktok: { source: null, filename: 'tiktok.png' },
  instagram: { source: null, filename: 'instagram.png' },
  'solitaire cash': { source: null, filename: 'solitaire-cash.png' },
  mistplay: { source: null, filename: 'mistplay.png' },
  swagbucks: { source: null, filename: 'swagbucks.png' },
};
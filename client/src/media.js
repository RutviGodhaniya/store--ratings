const shopPhotos = {
  cafe: 'https://images.unsplash.com/photo-1751956066306-c5684cbcf385?auto=format&fit=crop&w=1200&q=80',
  books: 'https://images.unsplash.com/photo-1762350834823-8b8cab219191?auto=format&fit=crop&w=1200&q=80',
  market: 'https://images.unsplash.com/photo-1759197894183-ffffa3c7fcd4?auto=format&fit=crop&w=1200&q=80',
};

export const communityPortraits = [
  'https://images.unsplash.com/photo-1578933301026-3e5e901126dc?auto=format&fit=crop&w=160&h=160&q=80',
  'https://images.unsplash.com/photo-1578863873955-40421002faa6?auto=format&fit=crop&w=160&h=160&q=80',
];

export function storePhotoFor(name = '') {
  const label = name.toLowerCase();
  if (/book|stationery|library/.test(label)) return shopPhotos.books;
  if (/market|grocery|basket|fresh|produce|food/.test(label)) return shopPhotos.market;
  return shopPhotos.cafe;
}

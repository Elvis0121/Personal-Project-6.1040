export type GalleryShot = {
  photo: string;
  url: string;
  display: boolean;
  filename?: string;
};

export function displayUrl(item: { displayPhoto?: string | null; photos?: GalleryShot[] }) {
  return item.displayPhoto ?? item.photos?.find((shot) => shot.display)?.url ?? item.photos?.[0]?.url ?? null;
}

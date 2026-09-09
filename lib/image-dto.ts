export type ImageDto = {
  id: string;
  slug: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  owner?: { username: string };
};

export type UserDto = {
  id: string;
  username: string;
  role: "ADMIN" | "USER";
  membershipTier: "FREE" | "PAID";
  createdAt: string;
  _count: { images: number };
};

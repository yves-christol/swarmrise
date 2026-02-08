import { RoleData } from "../shared/visualTypes";

export type { RoleData };

export type RolePosition = {
  role: RoleData;
  x: number;
  y: number;
  radius: number;
  memberName?: string;
};

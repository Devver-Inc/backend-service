import { RoleEnum } from "src/_utils/enums/role.enum";

export default interface JwtPayload {
  id: string;
  role: RoleEnum;
  email: string;
}

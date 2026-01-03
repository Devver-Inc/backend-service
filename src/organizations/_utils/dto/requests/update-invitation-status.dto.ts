import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";
import { UpdateInvitationStatusEnum } from "../../enums/update-invitations-status.enum";

export class UpdateInvitationStatusDto {
  @ApiProperty({
    enum: UpdateInvitationStatusEnum,
    description: "The new status for the invitation",
    example: UpdateInvitationStatusEnum.ACCEPTED,
  })
  @IsEnum(UpdateInvitationStatusEnum)
  @IsNotEmpty()
  status: UpdateInvitationStatusEnum;
}

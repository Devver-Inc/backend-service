import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSshKeyDto {
  @ApiProperty({
    example: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... joao@laptop',
  })
  @IsString()
  @MaxLength(16384)
  publicKey: string;

  @ApiPropertyOptional({ example: 'MacBook' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}

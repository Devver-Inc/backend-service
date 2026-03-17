import { ApiProperty } from '@nestjs/swagger';

export class GetRepoDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'my-repo' })
  name: string;

  @ApiProperty({ example: 'https://git.example.com/org/my-repo.git' })
  pushUrl: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  projectId: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}

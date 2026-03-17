import {
  HasMimeType,
  IsFile,
  MaxFileSize,
  MemoryStoredFile,
} from 'nestjs-form-data';
import { toMB } from 'src/_utils/file-size.helpers';
import { IMAGES_MIME_TYPES } from 'src/_utils/mime-type.constants';

export class UpdateProfilePictureDto {
  @IsFile()
  @MaxFileSize(toMB(8))
  @HasMimeType(IMAGES_MIME_TYPES)
  profilePictureFile: MemoryStoredFile;
}

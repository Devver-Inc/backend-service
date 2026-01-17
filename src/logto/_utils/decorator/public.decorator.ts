import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from 'src/_utils/constants';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

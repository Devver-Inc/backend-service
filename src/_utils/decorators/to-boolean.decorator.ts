import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export const ToBoolean = () =>
  applyDecorators(
    Transform(
      ({
        obj,
        key,
      }: {
        obj: Record<string, string | undefined>;
        key: string;
      }) => {
        const value = obj[key];
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return false;
      },
    ),
    IsBoolean(),
  );

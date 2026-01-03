import { applyDecorators } from '@nestjs/common'
import { Transform, TransformFnParams } from 'class-transformer'
import { IsNotEmpty, IsString, ValidationOptions } from 'class-validator'

export const IsNotEmptyString = (args?: ValidationOptions) =>
  applyDecorators(
    Transform(({ value }: TransformFnParams): string[] | string => {
      if (Array.isArray(value)) {
        return value.map((v: string) => {
          if (typeof v === 'string') {
            return v.trim()
          }
          return v
        })
      }
      if (typeof value === 'string') {
        return value.trim()
      }
      return value
    }),
    IsString(args),
    IsNotEmpty(args),
  )

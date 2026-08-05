import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStringRecord', async: false })
export class IsStringRecordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every((entry) => typeof entry === 'string')
    );
  }

  defaultMessage({ property }: ValidationArguments): string {
    return `${property} must be an object with string values`;
  }
}

export function IsStringRecord() {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      validator: IsStringRecordConstraint,
    });
  };
}

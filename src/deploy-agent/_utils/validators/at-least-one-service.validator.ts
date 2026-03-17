import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOneService', async: false })
export class AtLeastOneServiceConstraint implements ValidatorConstraintInterface {
  validate(service: unknown): boolean {
    if (!service || typeof service !== 'object') return false;
    return Object.values(service).some((v) => v != null);
  }
  defaultMessage(_args: ValidationArguments): string {
    return 'At least one service (web or api) must be defined';
  }
}

export function AtLeastOneService() {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      validator: AtLeastOneServiceConstraint,
    });
  };
}

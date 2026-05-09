import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'exactlyOneService', async: false })
export class ExactlyOneServiceConstraint implements ValidatorConstraintInterface {
  validate(service: unknown): boolean {
    if (!service || typeof service !== 'object') return false;

    const definedServices = Object.values(service).filter(
      (value) => value != null,
    );
    return definedServices.length === 1;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Exactly one service (web or api) must be defined';
  }
}

export function ExactlyOneService() {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      validator: ExactlyOneServiceConstraint,
    });
  };
}

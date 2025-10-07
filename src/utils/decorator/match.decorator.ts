import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidatorOptions,
} from 'class-validator';

export function Match(property: string, validationOptions?: ValidatorOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}

@ValidatorConstraint()
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, validationArguments: ValidationArguments) {
    const [relatedPropertyName] = validationArguments.constraints as string[];
    const relatedValue = (
      validationArguments.object as Record<string, unknown>
    )[relatedPropertyName];
    return value === relatedValue;
  }
  defaultMessage(validationArguments: ValidationArguments) {
    const [relatedPropertyName] = validationArguments.constraints as string[];
    return `${validationArguments.property} must match ${relatedPropertyName}`;
  }
}

# NestJS DTO Patterns

## Overview

DTOs (Data Transfer Objects) validate and transform incoming request data. They use class-validator decorators and align with OpenAPI schema definitions per the handbook's contract-first approach.

## Basic DTO Structure

```typescript
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  workspaceId: string;
}
```

## Common Validators

### String Validation

```typescript
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain letters and numbers',
  })
  password: string;
}
```

### Number Validation

```typescript
import { IsInt, IsNumber, Min, Max, IsPositive } from 'class-validator';

export class PaginationDto {
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;

  @IsInt()
  @Min(1)
  page: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  offset?: number;
}
```

### Boolean and Enum Validation

```typescript
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
}

export class UpdateChannelDto {
  @IsBoolean()
  @IsOptional()
  archived?: boolean;

  @IsEnum(ChannelType)
  @IsOptional()
  type?: ChannelType;
}
```

### Array Validation

```typescript
import { IsArray, ArrayMinSize, ArrayMaxSize, IsUUID } from 'class-validator';

export class AddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  userIds: string[];
}
```

### Date Validation

```typescript
import { IsDate, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsISO8601()
  startTime: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endTime?: Date;
}
```

## Nested DTOs

```typescript
import { ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  @Matches(/^\d{5}$/)
  zipCode: string;
}

export class CreateCompanyDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @IsOptional()
  branches?: AddressDto[];
}
```

## Custom Validation

### Custom Validator Decorator

```typescript
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsNotProfane(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotProfane',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const profanityList = ['badword1', 'badword2'];
          return typeof value === 'string' &&
                 !profanityList.some(word => value.toLowerCase().includes(word));
        },
        defaultMessage(args: ValidationArguments) {
          return 'Text contains inappropriate content';
        },
      },
    });
  };
}

export class CreateMessageDto {
  @IsString()
  @IsNotProfane()
  content: string;
}
```

## Transformation

### Type Transformation

```typescript
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString()
  @Transform(({ value }) => value.trim())
  name: string;
}
```

### Excluding Fields

```typescript
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Exclude()
  password: string;

  @Expose()
  createdAt: Date;
}
```

## Partial and Pick Types

```typescript
import { PartialType, PickType, OmitType } from '@nestjs/mapped-types';

export class CreateChannelDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUUID()
  workspaceId: string;

  @IsEnum(ChannelType)
  type: ChannelType;
}

// All fields optional
export class UpdateChannelDto extends PartialType(CreateChannelDto) {}

// Only specific fields
export class ChannelNameDto extends PickType(CreateChannelDto, ['name'] as const) {}

// Exclude specific fields
export class CreateChannelWithoutWorkspaceDto extends OmitType(CreateChannelDto, ['workspaceId'] as const) {}
```

## Validation Groups

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateChannelDto {
  @IsString({ groups: ['create', 'update'] })
  @IsNotEmpty({ groups: ['create'] })
  name: string;

  @IsString({ groups: ['create'] })
  workspaceId: string;
}
```

## Complete DTO Example

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
}

class ChannelSettingsDto {
  @IsBoolean()
  @IsOptional()
  allowThreads?: boolean;

  @IsBoolean()
  @IsOptional()
  allowReactions?: boolean;
}

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  @Transform(({ value }) => value.trim())
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(250)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsUUID('4')
  workspaceId: string;

  @IsEnum(ChannelType)
  type: ChannelType;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean = false;

  @ValidateNested()
  @Type(() => ChannelSettingsDto)
  @IsOptional()
  settings?: ChannelSettingsDto;
}
```

## Best Practices

1. **Match OpenAPI schemas** - DTOs should mirror contract definitions
2. **Use class-validator** - Leverage built-in validators before custom ones
3. **Transform early** - Sanitize inputs (trim, lowercase) in DTOs
4. **Validate strictly** - Don't allow unexpected fields (use whitelist: true)
5. **Nest when appropriate** - Use ValidateNested for complex objects
6. **Reuse with mapped types** - PartialType, PickType avoid duplication
7. **Document constraints** - Custom error messages for clarity

## References

- Handbook: `CONTRACT_FIRST.md` - DTOs implement OpenAPI schemas
- Handbook: `VALIDATION.md` - Input validation principles

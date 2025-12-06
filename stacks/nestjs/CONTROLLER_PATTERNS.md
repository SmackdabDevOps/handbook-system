# NestJS Controller Patterns

## Overview

Controllers in NestJS handle incoming HTTP requests and return responses to the client. They follow the handbook's contract-first principle by implementing routes defined in OpenAPI specifications.

## Core Decorators

### @Controller Decorator

```typescript
import { Controller } from '@nestjs/common';

// Route prefix for all endpoints in this controller
@Controller('users')
export class UsersController {
  // All routes here will be prefixed with /users
}

// Versioned API controller
@Controller({ path: 'users', version: '1' })
export class UsersV1Controller {}
```

### HTTP Method Decorators

```typescript
import { Controller, Get, Post, Put, Patch, Delete, HttpCode } from '@nestjs/common';

@Controller('channels')
export class ChannelsController {
  @Get()
  findAll() {
    // GET /channels
  }

  @Get(':id')
  findOne() {
    // GET /channels/:id
  }

  @Post()
  @HttpCode(201)
  create() {
    // POST /channels
  }

  @Put(':id')
  update() {
    // PUT /channels/:id
  }

  @Patch(':id')
  partialUpdate() {
    // PATCH /channels/:id
  }

  @Delete(':id')
  @HttpCode(204)
  remove() {
    // DELETE /channels/:id
  }
}
```

## Parameter Decorators

### @Param - Route Parameters

```typescript
import { Param, ParseUUIDPipe } from '@nestjs/common';

@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.channelsService.findOne(id);
}

@Get(':workspaceId/channels/:channelId')
async getChannel(
  @Param('workspaceId') workspaceId: string,
  @Param('channelId') channelId: string,
) {
  return this.channelsService.getByWorkspace(workspaceId, channelId);
}
```

### @Body - Request Body

```typescript
import { Body } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';

@Post()
async create(@Body() createChannelDto: CreateChannelDto) {
  return this.channelsService.create(createChannelDto);
}
```

### @Query - Query Parameters

```typescript
import { Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';

@Get()
async findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  @Query('search') search?: string,
) {
  return this.channelsService.findAll({ page, limit, search });
}
```

### @Headers and @Req - Request Metadata

```typescript
import { Headers, Req } from '@nestjs/common';
import { Request } from 'express';

@Get()
async findAll(
  @Headers('accept-language') language: string,
  @Req() request: Request,
) {
  const sessionId = request.headers['x-session-id'];
  return this.channelsService.findAll({ language });
}
```

## Guards and Authentication

### Using Guards

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('channels')
@UseGuards(SessionGuard) // Apply to all routes in controller
export class ChannelsController {
  @Get('public')
  @UseGuards() // Override: no guards for this route
  findPublic() {
    return this.channelsService.findPublic();
  }

  @Get('private')
  findPrivate(@CurrentUser() user: User) {
    // user is injected by SessionGuard
    return this.channelsService.findForUser(user.id);
  }
}
```

## Interceptors

### Response Transformation

```typescript
import { UseInterceptors } from '@nestjs/common';
import { ResponseEnvelopeInterceptor } from '../common/interceptors/response-envelope.interceptor';

@Controller('messages')
@UseInterceptors(ResponseEnvelopeInterceptor)
export class MessagesController {
  @Get()
  async findAll() {
    // Returns raw data, interceptor wraps in { data, message, toast, responseType }
    return this.messagesService.findAll();
  }
}
```

## Exception Handling

### Throwing HTTP Exceptions

```typescript
import {
  Controller,
  Get,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

@Controller('channels')
export class ChannelsController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const channel = await this.channelsService.findOne(id);

    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    return channel;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    const channel = await this.channelsService.findOne(id);

    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    if (channel.ownerId !== user.id) {
      throw new ForbiddenException('You do not own this channel');
    }

    await this.channelsService.remove(id);
  }
}
```

## Complete Controller Example

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { SessionGuard } from '../common/guards/session.guard';
import { ResponseEnvelopeInterceptor } from '../common/interceptors/response-envelope.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { User } from '../users/entities/user.entity';

@Controller('channels')
@UseGuards(SessionGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.channelsService.findAll({
      userId: user.id,
      workspaceId,
      page,
      limit,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.channelsService.findOne(id, user.id);
  }

  @Post()
  @HttpCode(201)
  async create(
    @Body() createChannelDto: CreateChannelDto,
    @CurrentUser() user: User,
  ) {
    return this.channelsService.create(createChannelDto, user.id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChannelDto: UpdateChannelDto,
    @CurrentUser() user: User,
  ) {
    return this.channelsService.update(id, updateChannelDto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.channelsService.remove(id, user.id);
  }
}
```

## Best Practices

1. **Keep controllers thin** - Delegate business logic to services
2. **Use DTOs** - Always validate request bodies with class-validator
3. **Use pipes** - ParseUUIDPipe, ParseIntPipe, etc. for type safety
4. **Apply guards** - Protect routes with authentication/authorization
5. **Use interceptors** - Transform responses consistently
6. **Return service data directly** - Let interceptors handle envelope wrapping
7. **Throw appropriate exceptions** - Use built-in HTTP exception classes
8. **Document with decorators** - Use @ApiOperation, @ApiResponse for OpenAPI

## References

- Handbook: `CONTRACT_FIRST.md` - API spec drives controller structure
- Handbook: `RESPONSE_ENVELOPE.md` - Use interceptors for consistent responses
- Handbook: `ERROR_HANDLING.md` - Exception filter patterns

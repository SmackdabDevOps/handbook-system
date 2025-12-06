# NestJS Module Structure

## Overview

Modules organize application code into cohesive blocks. They define providers (services, repositories), controllers, imports (dependencies), and exports (public API). Proper module structure supports the handbook's separation of concerns.

## Basic Module

```typescript
import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

@Module({
  controllers: [ChannelsController],
  providers: [ChannelsService],
})
export class ChannelsModule {}
```

## Module with Dependencies

```typescript
import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { ChannelRepository } from './channels.repository';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [UsersModule, WorkspacesModule], // Import other modules
  controllers: [ChannelsController],
  providers: [
    ChannelsService,
    ChannelRepository,
  ],
  exports: [ChannelsService], // Make service available to other modules
})
export class ChannelsModule {}
```

## Feature Module Pattern

```typescript
// src/modules/channels/channels.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ChannelsController } from './controllers/channels.controller';
import { ChannelsService } from './services/channels.service';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Channel, ChannelMember]),
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
```

## Shared Module Pattern

```typescript
// src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { ConfigService } from './services/config.service';
import { RedisService } from './services/redis.service';

@Global() // Makes module available everywhere without importing
@Module({
  providers: [LoggerService, ConfigService, RedisService],
  exports: [LoggerService, ConfigService, RedisService],
})
export class CommonModule {}
```

## Dynamic Modules

```typescript
import { Module, DynamicModule } from '@nestjs/common';
import { DatabaseService } from './database.service';

interface DatabaseOptions {
  host: string;
  port: number;
  database: string;
}

@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<DatabaseOptions> | DatabaseOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}

// Usage:
// DatabaseModule.forRoot({ host: 'localhost', port: 5432, database: 'app' })
```

## Circular Dependency Handling

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    forwardRef(() => MessagesModule), // Resolve circular dependency
  ],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}

// In service:
import { forwardRef, Inject } from '@nestjs/common';
import { MessagesService } from '../messages/messages.service';

export class ChannelsService {
  constructor(
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
  ) {}
}
```

## Module Organization by Feature

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── controllers/
│   │   │   └── auth.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── session.service.ts
│   │   ├── guards/
│   │   │   └── session.guard.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   └── entities/
│   │       └── session.entity.ts
│   │
│   ├── channels/
│   │   ├── channels.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── entities/
│   │
│   └── messages/
│       ├── messages.module.ts
│       ├── controllers/
│       ├── services/
│       ├── dto/
│       └── entities/
```

## Root Application Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { MessagesModule } from './modules/messages/messages.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadModels: true,
      synchronize: false,
    }),

    // Common/shared utilities
    CommonModule,

    // Feature modules
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ChannelsModule,
    MessagesModule,
  ],
})
export class AppModule {}
```

## Custom Providers in Modules

```typescript
import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CHANNEL_REPOSITORY } from './channels.constants';
import { Channel } from './entities/channel.entity';

@Module({
  providers: [
    ChannelsService,
    // Class provider
    {
      provide: ChannelsService,
      useClass: ChannelsService,
    },
    // Value provider
    {
      provide: 'CONFIG',
      useValue: { maxChannels: 100 },
    },
    // Factory provider
    {
      provide: CHANNEL_REPOSITORY,
      useFactory: (connection) => {
        return connection.getRepository(Channel);
      },
      inject: ['DATABASE_CONNECTION'],
    },
    // Existing provider
    {
      provide: 'LOGGER',
      useExisting: LoggerService,
    },
  ],
})
export class ChannelsModule {}
```

## Module Re-exports

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [DatabaseModule, CacheModule, LoggerModule],
  exports: [DatabaseModule, CacheModule, LoggerModule],
})
export class CoreModule {}

// Other modules can now import CoreModule to get all three
```

## Complete Example Module

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ChannelsController } from './controllers/channels.controller';
import { ChannelMembersController } from './controllers/channel-members.controller';
import { ChannelsService } from './services/channels.service';
import { ChannelMembersService } from './services/channel-members.service';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    // Database entities
    SequelizeModule.forFeature([Channel, ChannelMember]),

    // Other modules
    UsersModule,
    WorkspacesModule,
    forwardRef(() => MessagesModule), // Handle circular dependency
  ],
  controllers: [
    ChannelsController,
    ChannelMembersController,
  ],
  providers: [
    ChannelsService,
    ChannelMembersService,
    // Custom provider example
    {
      provide: 'CHANNEL_CONFIG',
      useValue: {
        maxMembers: 1000,
        defaultType: 'public',
      },
    },
  ],
  exports: [
    ChannelsService,
    ChannelMembersService,
  ],
})
export class ChannelsModule {}
```

## Best Practices

1. **One module per feature** - Keep related functionality together
2. **Export only what's needed** - Minimize module coupling
3. **Use forwardRef sparingly** - Indicates design smell, refactor if possible
4. **Make common utilities global** - Use @Global() for truly shared services
5. **Organize by domain** - Group controllers, services, DTOs by feature
6. **Use dynamic modules for configuration** - forRoot/forRootAsync patterns
7. **Keep modules focused** - Single responsibility principle applies to modules

## References

- Handbook: `SEPARATION_OF_CONCERNS.md` - Module boundaries
- Handbook: `DEPENDENCY_MANAGEMENT.md` - Import/export patterns

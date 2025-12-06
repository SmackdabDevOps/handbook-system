# NestJS Service Patterns

## Overview

Services contain business logic and interact with data sources. They are injectable providers that implement the handbook's separation of concerns: controllers handle HTTP, services handle domain logic.

## Basic Injectable Service

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChannelsService {
  async findAll() {
    return [];
  }

  async findOne(id: string) {
    return null;
  }

  async create(data: any) {
    return {};
  }

  async update(id: string, data: any) {
    return {};
  }

  async remove(id: string) {
    return;
  }
}
```

## Service with Dependency Injection

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Channel } from './entities/channel.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel)
    private channelModel: typeof Channel,
  ) {}

  async findAll(workspaceId: string): Promise<Channel[]> {
    return this.channelModel.findAll({
      where: { workspaceId },
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: string): Promise<Channel> {
    const channel = await this.channelModel.findByPk(id);

    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    return channel;
  }

  async create(createChannelDto: CreateChannelDto): Promise<Channel> {
    return this.channelModel.create({
      ...createChannelDto,
      id: uuidv7(),
    });
  }

  async update(id: string, updateChannelDto: UpdateChannelDto): Promise<Channel> {
    const channel = await this.findOne(id);
    return channel.update(updateChannelDto);
  }

  async remove(id: string): Promise<void> {
    const channel = await this.findOne(id);
    await channel.destroy();
  }
}
```

## Service with Multiple Dependencies

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Channel } from './entities/channel.entity';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RedisService } from '../common/services/redis.service';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel)
    private channelModel: typeof Channel,
    private usersService: UsersService,
    private workspacesService: WorkspacesService,
    private redisService: RedisService,
    private logger: LoggerService,
  ) {
    this.logger.setContext(ChannelsService.name);
  }

  async create(createChannelDto: CreateChannelDto, userId: string): Promise<Channel> {
    const user = await this.usersService.findOne(userId);
    const workspace = await this.workspacesService.findOne(createChannelDto.workspaceId);

    this.logger.log(`User ${userId} creating channel in workspace ${workspace.id}`);

    const channel = await this.channelModel.create({
      ...createChannelDto,
      id: uuidv7(),
      createdBy: userId,
    });

    // Invalidate cache
    await this.redisService.del(`workspace:${workspace.id}:channels`);

    return channel;
  }
}
```

## Transaction Handling

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel)
    private channelModel: typeof Channel,
    @InjectModel(ChannelMember)
    private channelMemberModel: typeof ChannelMember,
    private sequelize: Sequelize,
  ) {}

  async createWithMembers(
    createChannelDto: CreateChannelDto,
    memberIds: string[],
  ): Promise<Channel> {
    const transaction = await this.sequelize.transaction();

    try {
      // Create channel
      const channel = await this.channelModel.create(
        {
          ...createChannelDto,
          id: uuidv7(),
        },
        { transaction },
      );

      // Add members
      const members = memberIds.map(userId => ({
        id: uuidv7(),
        channelId: channel.id,
        userId,
      }));

      await this.channelMemberModel.bulkCreate(members, { transaction });

      await transaction.commit();
      return channel;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

## Error Handling in Services

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

@Injectable()
export class ChannelsService {
  async findOne(id: string): Promise<Channel> {
    const channel = await this.channelModel.findByPk(id);

    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    return channel;
  }

  async create(createChannelDto: CreateChannelDto, userId: string): Promise<Channel> {
    // Check for duplicate
    const existing = await this.channelModel.findOne({
      where: {
        name: createChannelDto.name,
        workspaceId: createChannelDto.workspaceId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Channel "${createChannelDto.name}" already exists in this workspace`,
      );
    }

    // Validate permissions
    const canCreate = await this.workspacesService.canUserCreateChannel(
      createChannelDto.workspaceId,
      userId,
    );

    if (!canCreate) {
      throw new ForbiddenException('You do not have permission to create channels');
    }

    return this.channelModel.create({
      ...createChannelDto,
      id: uuidv7(),
      createdBy: userId,
    });
  }

  async update(id: string, updateChannelDto: UpdateChannelDto, userId: string): Promise<Channel> {
    const channel = await this.findOne(id);

    if (channel.createdBy !== userId) {
      throw new ForbiddenException('You can only update channels you created');
    }

    return channel.update(updateChannelDto);
  }
}
```

## Repository Pattern in Services

```typescript
import { Injectable } from '@nestjs/common';
import { ChannelRepository } from './repositories/channel.repository';
import { CreateChannelDto } from './dto/create-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(private channelRepository: ChannelRepository) {}

  async findAll(workspaceId: string) {
    return this.channelRepository.findByWorkspace(workspaceId);
  }

  async findOne(id: string) {
    const channel = await this.channelRepository.findById(id);

    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    return channel;
  }

  async create(createChannelDto: CreateChannelDto, userId: string) {
    return this.channelRepository.create({
      ...createChannelDto,
      createdBy: userId,
    });
  }
}

// Repository:
@Injectable()
export class ChannelRepository {
  constructor(
    @InjectModel(Channel)
    private channelModel: typeof Channel,
  ) {}

  async findById(id: string): Promise<Channel | null> {
    return this.channelModel.findByPk(id, {
      include: ['members', 'creator'],
    });
  }

  async findByWorkspace(workspaceId: string): Promise<Channel[]> {
    return this.channelModel.findAll({
      where: { workspaceId },
      order: [['createdAt', 'DESC']],
    });
  }

  async create(data: Partial<Channel>): Promise<Channel> {
    return this.channelModel.create({
      ...data,
      id: uuidv7(),
    });
  }
}
```

## Complete Service Example

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { LoggerService } from '../common/services/logger.service';
import { RedisService } from '../common/services/redis.service';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel)
    private channelModel: typeof Channel,
    @InjectModel(ChannelMember)
    private channelMemberModel: typeof ChannelMember,
    private workspacesService: WorkspacesService,
    private logger: LoggerService,
    private redisService: RedisService,
    private sequelize: Sequelize,
  ) {
    this.logger.setContext(ChannelsService.name);
  }

  async findAll(workspaceId: string, userId: string): Promise<Channel[]> {
    const cacheKey = `workspace:${workspaceId}:user:${userId}:channels`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const channels = await this.channelModel.findAll({
      where: { workspaceId },
      include: [
        {
          model: ChannelMember,
          as: 'members',
          where: { userId },
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    await this.redisService.setex(cacheKey, 300, JSON.stringify(channels));
    return channels;
  }

  async findOne(id: string, userId: string): Promise<Channel> {
    const channel = await this.channelModel.findByPk(id, {
      include: ['members', 'workspace'],
    });

    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    const isMember = await this.channelMemberModel.findOne({
      where: { channelId: id, userId },
    });

    if (!isMember && channel.isPrivate) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    return channel;
  }

  async create(createChannelDto: CreateChannelDto, userId: string): Promise<Channel> {
    const transaction = await this.sequelize.transaction();

    try {
      // Check for duplicate
      const existing = await this.channelModel.findOne({
        where: {
          name: createChannelDto.name,
          workspaceId: createChannelDto.workspaceId,
        },
      });

      if (existing) {
        throw new ConflictException('Channel with this name already exists');
      }

      // Create channel
      const channel = await this.channelModel.create(
        {
          ...createChannelDto,
          id: uuidv7(),
          createdBy: userId,
        },
        { transaction },
      );

      // Add creator as member
      await this.channelMemberModel.create(
        {
          id: uuidv7(),
          channelId: channel.id,
          userId,
          role: 'owner',
        },
        { transaction },
      );

      await transaction.commit();

      this.logger.log(`Channel ${channel.id} created by user ${userId}`);
      await this.redisService.del(`workspace:${channel.workspaceId}:user:${userId}:channels`);

      return channel;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id: string, updateChannelDto: UpdateChannelDto, userId: string): Promise<Channel> {
    const channel = await this.findOne(id, userId);

    if (channel.createdBy !== userId) {
      throw new ForbiddenException('Only the channel creator can update it');
    }

    await channel.update(updateChannelDto);
    await this.redisService.del(`workspace:${channel.workspaceId}:user:${userId}:channels`);

    return channel;
  }

  async remove(id: string, userId: string): Promise<void> {
    const channel = await this.findOne(id, userId);

    if (channel.createdBy !== userId) {
      throw new ForbiddenException('Only the channel creator can delete it');
    }

    await channel.destroy();
    await this.redisService.del(`workspace:${channel.workspaceId}:user:${userId}:channels`);

    this.logger.log(`Channel ${id} deleted by user ${userId}`);
  }
}
```

## Best Practices

1. **Single responsibility** - Each service handles one domain area
2. **Inject dependencies** - Use constructor injection for all dependencies
3. **Use repositories** - Separate data access from business logic
4. **Handle transactions** - Use Sequelize transactions for multi-step operations
5. **Throw appropriate exceptions** - Use NestJS HTTP exceptions
6. **Log important actions** - Use LoggerService with context
7. **Cache where appropriate** - Use Redis for frequently accessed data
8. **Validate permissions** - Check authorization in service layer

## References

- Handbook: `SEPARATION_OF_CONCERNS.md` - Business logic in services
- Handbook: `ERROR_HANDLING.md` - Service error patterns
- Handbook: `TRANSACTIONS.md` - Database transaction handling

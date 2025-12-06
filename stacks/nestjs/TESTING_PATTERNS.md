# NestJS Testing Patterns

## Overview

NestJS testing follows the handbook's TDD approach: write failing tests first, implement minimum code to pass, then refactor. Use Test.createTestingModule() to create isolated testing contexts with mocked dependencies.

## Unit Testing Setup

### Basic Test Module

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsService } from './channels.service';
import { getModelToken } from '@nestjs/sequelize';
import { Channel } from './entities/channel.entity';

describe('ChannelsService', () => {
  let service: ChannelsService;
  let channelModel: typeof Channel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        {
          provide: getModelToken(Channel),
          useValue: {
            findAll: jest.fn(),
            findByPk: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChannelsService>(ChannelsService);
    channelModel = module.get<typeof Channel>(getModelToken(Channel));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Mocking Providers

### Mock Repository/Model

```typescript
const mockChannelModel = {
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ChannelsService,
      {
        provide: getModelToken(Channel),
        useValue: mockChannelModel,
      },
    ],
  }).compile();

  service = module.get<ChannelsService>(ChannelsService);
});
```

### Mock Service Dependencies

```typescript
const mockUsersService = {
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ChannelsService,
      {
        provide: getModelToken(Channel),
        useValue: mockChannelModel,
      },
      {
        provide: UsersService,
        useValue: mockUsersService,
      },
      {
        provide: RedisService,
        useValue: mockRedisService,
      },
    ],
  }).compile();

  service = module.get<ChannelsService>(ChannelsService);
});
```

## Unit Test Examples

### Testing Service Methods

```typescript
describe('ChannelsService', () => {
  describe('findOne', () => {
    it('should return a channel when found', async () => {
      const channelId = 'test-uuid';
      const mockChannel = {
        id: channelId,
        name: 'Test Channel',
        workspaceId: 'workspace-uuid',
      };

      mockChannelModel.findByPk.mockResolvedValue(mockChannel);

      const result = await service.findOne(channelId);

      expect(result).toEqual(mockChannel);
      expect(mockChannelModel.findByPk).toHaveBeenCalledWith(channelId);
    });

    it('should throw NotFoundException when channel not found', async () => {
      const channelId = 'nonexistent-uuid';

      mockChannelModel.findByPk.mockResolvedValue(null);

      await expect(service.findOne(channelId)).rejects.toThrow(NotFoundException);
      expect(mockChannelModel.findByPk).toHaveBeenCalledWith(channelId);
    });
  });

  describe('create', () => {
    it('should create a new channel', async () => {
      const createDto = {
        name: 'New Channel',
        workspaceId: 'workspace-uuid',
        type: 'public',
      };

      const mockCreatedChannel = {
        id: 'new-uuid',
        ...createDto,
      };

      mockChannelModel.create.mockResolvedValue(mockCreatedChannel);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCreatedChannel);
      expect(mockChannelModel.create).toHaveBeenCalledWith(
        expect.objectContaining(createDto),
      );
    });
  });
});
```

### Testing with Transactions

```typescript
describe('createWithMembers', () => {
  it('should create channel and members in transaction', async () => {
    const createDto = { name: 'Test', workspaceId: 'ws-1' };
    const memberIds = ['user-1', 'user-2'];

    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockSequelize.transaction.mockResolvedValue(mockTransaction);
    mockChannelModel.create.mockResolvedValue({ id: 'ch-1', ...createDto });
    mockChannelMemberModel.bulkCreate.mockResolvedValue([]);

    await service.createWithMembers(createDto, memberIds);

    expect(mockChannelModel.create).toHaveBeenCalledWith(
      expect.anything(),
      { transaction: mockTransaction },
    );
    expect(mockChannelMemberModel.bulkCreate).toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  it('should rollback transaction on error', async () => {
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockSequelize.transaction.mockResolvedValue(mockTransaction);
    mockChannelModel.create.mockRejectedValue(new Error('DB Error'));

    await expect(service.createWithMembers({}, [])).rejects.toThrow();

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });
});
```

## Controller Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

describe('ChannelsController', () => {
  let controller: ChannelsController;
  let service: ChannelsService;

  const mockChannelsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [
        {
          provide: ChannelsService,
          useValue: mockChannelsService,
        },
      ],
    }).compile();

    controller = module.get<ChannelsController>(ChannelsController);
    service = module.get<ChannelsService>(ChannelsService);
  });

  describe('findAll', () => {
    it('should return an array of channels', async () => {
      const mockChannels = [{ id: '1', name: 'Test' }];
      mockChannelsService.findAll.mockResolvedValue(mockChannels);

      const result = await controller.findAll('workspace-1', 1, 20);

      expect(result).toEqual(mockChannels);
      expect(service.findAll).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        page: 1,
        limit: 20,
      });
    });
  });
});
```

## E2E Testing

### E2E Test Setup

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Sequelize } from 'sequelize-typescript';

describe('Channels (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same middleware as main app
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    sequelize = app.get(Sequelize);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await sequelize.sync({ force: true });
  });

  describe('/channels (GET)', () => {
    it('should return channels for workspace', async () => {
      const response = await request(app.getHttpServer())
        .get('/channels')
        .query({ workspaceId: 'workspace-1' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/channels')
        .expect(401);
    });
  });

  describe('/channels (POST)', () => {
    it('should create a new channel', async () => {
      const createDto = {
        name: 'New Channel',
        workspaceId: 'workspace-1',
        type: 'public',
      };

      const response = await request(app.getHttpServer())
        .post('/channels')
        .send(createDto)
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: createDto.name,
        workspaceId: createDto.workspaceId,
      });
      expect(response.body.data).toHaveProperty('id');
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/channels')
        .send({ name: 'Missing workspace' })
        .expect(400);
    });
  });
});
```

## Contract Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';

describe('Channels Contract Tests', () => {
  let controller: ChannelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [
        {
          provide: ChannelsService,
          useValue: {
            create: jest.fn().mockResolvedValue({
              id: 'uuid',
              name: 'Test',
              workspaceId: 'ws-1',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ChannelsController>(ChannelsController);
  });

  describe('Response Envelope Contract', () => {
    it('should return response in correct envelope format', async () => {
      const createDto: CreateChannelDto = {
        name: 'Test Channel',
        workspaceId: 'workspace-1',
        type: 'public',
      };

      const result = await controller.create(createDto);

      // Verify envelope structure (if interceptor applied)
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('toast');
      expect(result).toHaveProperty('responseType');
    });
  });

  describe('OpenAPI Contract Compliance', () => {
    it('should match OpenAPI schema for channel response', async () => {
      const result = await controller.findOne('uuid');

      expect(result).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        workspaceId: expect.any(String),
        type: expect.stringMatching(/^(public|private|direct)$/),
        createdAt: expect.any(Date),
      });
    });
  });
});
```

## Coverage Configuration

```json
// package.json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s",
      "!**/*.spec.ts",
      "!**/node_modules/**",
      "!**/dist/**"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "coverageThresholds": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Complete Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { getModelToken } from '@nestjs/sequelize';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { RedisService } from '../common/services/redis.service';
import { LoggerService } from '../common/services/logger.service';

describe('ChannelsService', () => {
  let service: ChannelsService;
  let channelModel: any;
  let channelMemberModel: any;
  let redisService: any;
  let loggerService: any;

  const mockChannel = {
    id: 'channel-uuid',
    name: 'Test Channel',
    workspaceId: 'workspace-uuid',
    createdBy: 'user-uuid',
    isPrivate: false,
    update: jest.fn(),
    destroy: jest.fn(),
  };

  beforeEach(async () => {
    channelModel = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    channelMemberModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    redisService = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    loggerService = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        {
          provide: getModelToken(Channel),
          useValue: channelModel,
        },
        {
          provide: getModelToken(ChannelMember),
          useValue: channelMemberModel,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: LoggerService,
          useValue: loggerService,
        },
      ],
    }).compile();

    service = module.get<ChannelsService>(ChannelsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return channel when found and user is member', async () => {
      channelModel.findByPk.mockResolvedValue(mockChannel);
      channelMemberModel.findOne.mockResolvedValue({ userId: 'user-uuid' });

      const result = await service.findOne('channel-uuid', 'user-uuid');

      expect(result).toEqual(mockChannel);
      expect(channelModel.findByPk).toHaveBeenCalledWith('channel-uuid', expect.any(Object));
    });

    it('should throw NotFoundException when channel does not exist', async () => {
      channelModel.findByPk.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-uuid'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user not member of private channel', async () => {
      const privateChannel = { ...mockChannel, isPrivate: true };
      channelModel.findByPk.mockResolvedValue(privateChannel);
      channelMemberModel.findOne.mockResolvedValue(null);

      await expect(service.findOne('channel-uuid', 'user-uuid'))
        .rejects
        .toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update channel when user is creator', async () => {
      const updateDto = { name: 'Updated Name' };
      channelModel.findByPk.mockResolvedValue(mockChannel);
      channelMemberModel.findOne.mockResolvedValue({ userId: 'user-uuid' });
      mockChannel.update.mockResolvedValue({ ...mockChannel, ...updateDto });

      const result = await service.update('channel-uuid', updateDto, 'user-uuid');

      expect(mockChannel.update).toHaveBeenCalledWith(updateDto);
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not creator', async () => {
      channelModel.findByPk.mockResolvedValue(mockChannel);
      channelMemberModel.findOne.mockResolvedValue({ userId: 'other-user' });

      await expect(service.update('channel-uuid', {}, 'other-user'))
        .rejects
        .toThrow(ForbiddenException);
    });
  });
});
```

## Best Practices

1. **Isolate tests** - Use Test.createTestingModule() for clean test context
2. **Mock all dependencies** - Don't let tests depend on external services
3. **Test business logic** - Focus on service layer, not just controllers
4. **Use real database for E2E** - Per handbook, avoid in-memory SQLite
5. **Clean state between tests** - Reset mocks and database
6. **Test error cases** - Verify exceptions are thrown correctly
7. **Check coverage** - Aim for 80%+ coverage on critical paths
8. **Follow TDD** - Red → Green → Refactor

## References

- Handbook: `TDD.md` - Test-driven development workflow
- Handbook: `TESTING_STRATEGY.md` - Unit, integration, E2E approach
- NestJS Docs: Testing - https://docs.nestjs.com/fundamentals/testing

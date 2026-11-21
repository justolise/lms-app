import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { RedisModule } from './redis/redis.module.js';
import { MembersModule } from './members/members.module.js';
import { MemberTypesModule } from './member-types/member-types.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [AuthModule, RedisModule, MembersModule, MemberTypesModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { RedisModule } from './redis/redis.module.js';
import { MembersModule } from './members/members.module.js';
import { MemberTypesModule } from './member-types/member-types.module.js';
import { UsersModule } from './users/users.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { CirculationModule } from './circulation/circulation.module.js';

@Module({
  imports: [
    AuthModule,
    RedisModule,
    MembersModule,
    MemberTypesModule,
    UsersModule,
    CatalogueModule,
    CategoriesModule,
    CirculationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

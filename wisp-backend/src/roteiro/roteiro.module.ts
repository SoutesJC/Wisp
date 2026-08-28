import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoteiroService } from './roteiro.service';
import { RoteiroController } from './roteiro.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [ConfigModule, CommonModule],
  controllers: [RoteiroController],
  providers: [RoteiroService],
  exports: [RoteiroService],
})
export class RoteiroModule {}

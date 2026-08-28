import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoteiroModule } from './roteiro/roteiro.module';
import { ImageGenModule } from './image-gen/image-gen.module';
import { TtsModule } from './tts/tts.module';
import { RenderModule } from './render/render.module';
import { StorageModule } from './storage/storage.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { QueueModule } from './queue/queue.module';
import { CommonModule } from './common/common.module';

const redisLogger = new Logger('Redis');

function criarConexaoRedis(url: string): Redis {
  const connection = new Redis(url, {
    maxRetriesPerRequest: null,
    // backoff mais espaçado (até 10s) — o padrão do ioredis tenta de novo
    // rápido demais e inunda o log enquanto o Redis não sobe (normal até
    // a Fase 5, onde a fila passa a ser usada de verdade).
    retryStrategy: (tentativas) => Math.min(tentativas * 200, 10_000),
  });

  let jaAvisou = false;
  connection.on('error', (err) => {
    if (!jaAvisou) {
      redisLogger.warn(
        `Sem conexão com Redis (${url}) — a fila do BullMQ fica inativa até conectar. Isso é esperado se você ainda não rodou um Redis local (necessário só a partir da Fase 5). Detalhe: ${err.message}`,
      );
      jaAvisou = true;
    }
  });
  connection.on('connect', () => {
    if (jaAvisou) redisLogger.log('Redis conectado.');
    jaAvisou = false;
  });

  return connection;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // ConnectionOptions do BullMQ não tem campo `url` — a forma
        // documentada de configurar por URL é montar a instância do
        // ioredis e passar ela pronta.
        connection: criarConexaoRedis(config.get<string>('REDIS_URL')!),
      }),
    }),
    RoteiroModule,
    ImageGenModule,
    TtsModule,
    RenderModule,
    StorageModule,
    PipelineModule,
    QueueModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

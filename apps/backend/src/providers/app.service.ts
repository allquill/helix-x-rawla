import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class HealthDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

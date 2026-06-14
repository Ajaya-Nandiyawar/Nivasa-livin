import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { EnvConfig } from '../../config/env.config';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService<EnvConfig>) {
    const accountId = this.configService.getOrThrow('R2_ACCOUNT_ID');
    this.bucketName = this.configService.getOrThrow('R2_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded successfully: ${fileName}`);

      // Assume public bucket routing for simplicity
      const url = `https://cdn.nivasapg.com/${fileName}`;
      return { url, key: fileName };
    } catch (error) {
      this.logger.error(`Failed to upload file to R2: ${error.message}`);
      throw error;
    }
  }
}

import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// --- Types ---

export const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export interface UploadObjectParams {
  bucket: string
  key: string
  body: Buffer | string
  contentType?: string
}

export interface DeleteObjectParams {
  bucket: string
  key: string
}

export interface GenerateSignedUrlParams {
  bucket: string
  key: string
  expiresIn?: number
  useGet?: boolean
}

export interface UploadResult {
  key: string
  etag?: string
}

export interface AudioSizeValidation {
  valid: boolean
  sizeMb: number
}

// --- StorageService Interface ---

export interface StorageService {
  uploadObject(params: UploadObjectParams): Promise<UploadResult>
  deleteObject(params: DeleteObjectParams): Promise<void>
  generateSignedUrl(params: GenerateSignedUrlParams): Promise<string>
}

// --- Helpers ---

export function validateAudioUploadSize(
  fileSizeBytes: number,
): AudioSizeValidation {
  const sizeMb = Math.ceil(fileSizeBytes / (1024 * 1024))
  return {
    valid: sizeMb <= 50,
    sizeMb,
  }
}

// --- S3StorageService Implementation ---

export interface S3StorageServiceOptions {
  region: string
  endpoint?: string
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
}

export function createS3Client(options: S3StorageServiceOptions): S3Client {
  const { S3Client: S3ClientCtor } = require('@aws-sdk/client-s3')
  return new S3ClientCtor({
    region: options.region,
    endpoint: options.endpoint,
    credentials: options.credentials,
    forcePathStyle: false,
  })
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client

  constructor(options: S3StorageServiceOptions) {
    this.client = createS3Client(options)
  }

  async uploadObject(params: UploadObjectParams): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })

    await this.client.send(command)

    return { key: params.key }
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    })

    await this.client.send(command)
  }

  async generateSignedUrl(
    params: GenerateSignedUrlParams,
  ): Promise<string> {
    const expiresIn = Math.min(params.expiresIn ?? 3600, 3600)

    const command = params.useGet
      ? new GetObjectCommand({
          Bucket: params.bucket,
          Key: params.key,
        })
      : new PutObjectCommand({
          Bucket: params.bucket,
          Key: params.key,
        })

    return getSignedUrl(this.client, command, { expiresIn })
  }
}

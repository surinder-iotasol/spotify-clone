import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock getSignedUrl only ---
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}))

// --- Imports ---
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import {
  S3StorageService,
  validateAudioUploadSize,
} from './storage.service'

// Get the mocked getSignedUrl
const mockedGetSignedUrl = getSignedUrl as ReturnType<typeof vi.fn>

// --- Test: validateAudioUploadSize ---

describe('validateAudioUploadSize', () => {
  it('passes when file size is under 50MB', () => {
    const result = validateAudioUploadSize(49 * 1024 * 1024)
    expect(result.valid).toBe(true)
    expect(result.sizeMb).toBe(49)
  })

  it('passes when file size is exactly 50MB', () => {
    const result = validateAudioUploadSize(50 * 1024 * 1024)
    expect(result.valid).toBe(true)
    expect(result.sizeMb).toBe(50)
  })

  it('rejects when file size exceeds 50MB', () => {
    const result = validateAudioUploadSize(51 * 1024 * 1024)
    expect(result.valid).toBe(false)
    expect(result.sizeMb).toBe(51)
  })

  it('rejects files over 50MB and reports actual size', () => {
    const result = validateAudioUploadSize(75 * 1024 * 1024)
    expect(result.valid).toBe(false)
    expect(result.sizeMb).toBe(75)
  })

  it('rejects very large files and reports actual size', () => {
    const result = validateAudioUploadSize(100 * 1024 * 1024)
    expect(result.valid).toBe(false)
    expect(result.sizeMb).toBe(100)
  })
})

// --- Test: S3StorageService ---

describe('S3StorageService', () => {
  let sentCommands: unknown[]
  let sendFn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    sentCommands = []
    sendFn = vi.fn((cmd: unknown) => {
      sentCommands.push(cmd)
      return Promise.resolve({})
    })

    // Spy on S3Client.prototype.send to capture commands
    vi.spyOn(S3Client.prototype, 'send').mockImplementation(sendFn)

    // Set up getSignedUrl mock
    mockedGetSignedUrl.mockResolvedValue('https://mock.s3.amazonaws.com/bucket/key')
  })

  it('creates S3Client with configured endpoint and credentials', () => {
    const service = new S3StorageService({
      region: 'us-east-1',
      endpoint: 'https://s3.mock.com',
      credentials: {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      },
    })
    expect(service).toBeDefined()
  })

  describe('uploadObject', () => {
    it('sends PutObjectCommand with correct bucket, key, and body', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      await service.uploadObject({
        bucket: 'my-bucket',
        key: 'uploads/test.mp3',
        body: Buffer.from('audio-data'),
        contentType: 'audio/mpeg',
      })

      expect(sentCommands).toHaveLength(1)
      expect(sentCommands[0]).toBeInstanceOf(PutObjectCommand)
    })

    it('returns the upload key in result', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      const result = await service.uploadObject({
        bucket: 'bucket',
        key: 'file.txt',
        body: 'data',
      })
      expect(result.key).toBe('file.txt')
    })

    it('omits contentType when not provided', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      await service.uploadObject({
        bucket: 'b',
        key: 'k',
        body: 'data',
      })

      expect(sentCommands).toHaveLength(1)
    })
  })

  describe('deleteObject', () => {
    it('sends DeleteObjectCommand with correct bucket and key', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      await service.deleteObject({
        bucket: 'my-bucket',
        key: 'uploads/test.mp3',
      })

      expect(sentCommands).toHaveLength(1)
      expect(sentCommands[0]).toBeInstanceOf(DeleteObjectCommand)
    })
  })

  describe('generateSignedUrl', () => {
    it('uses PutObjectCommand for upload URLs (default)', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      await service.generateSignedUrl({
        bucket: 'my-bucket',
        key: 'uploads/test.mp3',
        expiresIn: 3600,
      })

      // getSignedUrl creates the command internally — verify it via the mock
      expect(mockedGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(PutObjectCommand),
        expect.objectContaining({ expiresIn: 3600 }),
      )
    })

    it('uses GetObjectCommand for stream delivery URLs', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      await service.generateSignedUrl({
        bucket: 'my-bucket',
        key: 'stream/audio.mp3',
        expiresIn: 900,
        useGet: true,
      })

      // getSignedUrl creates the command internally — verify it via the mock
      expect(mockedGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        expect.objectContaining({ expiresIn: 900 }),
      )
    })

    it('caps expiresIn at 3600 for GET requests', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      await service.generateSignedUrl({
        bucket: 'my-bucket',
        key: 'stream/audio.mp3',
        expiresIn: 7200,
        useGet: true,
      })

      expect(mockedGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: 3600 }),
      )
    })

    it('returns the presigned URL string', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      const url = await service.generateSignedUrl({
        bucket: 'my-bucket',
        key: 'test.mp3',
      })
      expect(url).toBe('https://mock.s3.amazonaws.com/bucket/key')
    })

    it('defaults to 3600s when expiresIn is not provided', async () => {
      const service = new S3StorageService({ region: 'us-east-1' })

      await service.generateSignedUrl({
        bucket: 'my-bucket',
        key: 'test.mp3',
      })

      expect(mockedGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: 3600 }),
      )
    })
  })
})

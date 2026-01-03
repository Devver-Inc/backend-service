export enum MIME_TYPE {
  JPEG = 'image/jpeg',
  JPG = 'image/jpg',
  GIF = 'image/gif',
  SVG = 'image/svg+xml',
  WEBP = 'image/webp',
  PNG = 'image/png',
  PDF = 'application/pdf',
  MP3 = 'audio/mpeg',
  WAV = 'audio/wav',
  CSV = 'text/csv',
  JSON = 'application/json',
  X_WAV = 'audio/x-wav',
  VND_WAVE = 'audio/vnd.wave',
  TXT = 'text/plain',
}

export const IMAGES_MIME_TYPES = [
  MIME_TYPE.JPEG,
  MIME_TYPE.JPG,
  MIME_TYPE.PNG,
  MIME_TYPE.WEBP,
  MIME_TYPE.GIF,
  MIME_TYPE.SVG,
]
export const DOCUMENT_MIME_TYPES = [MIME_TYPE.PDF, MIME_TYPE.CSV, MIME_TYPE.JSON, MIME_TYPE.TXT]
export const AUDIO_MIME_TYPES = [MIME_TYPE.MP3, MIME_TYPE.WAV, MIME_TYPE.X_WAV, MIME_TYPE.VND_WAVE]
export const IMAGE_MIME_TYPE_PREFIX = 'image/'

export const ALLOWED_MIME_TYPES = {
  IMAGES: IMAGES_MIME_TYPES,
  ATTACHMENTS: [...IMAGES_MIME_TYPES, ...DOCUMENT_MIME_TYPES, ...AUDIO_MIME_TYPES],
}

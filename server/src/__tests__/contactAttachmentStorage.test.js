jest.mock('../config/database.js', () => {
  const uploadedFile = {
    upsert: jest.fn().mockResolvedValue({ key: 'contact-test.png', data: Buffer.from('x') }),
    findUnique: jest.fn(),
  }
  return { prisma: { uploadedFile, $transaction: jest.fn(async (fn) => fn({ uploadedFile })) } }
})

const fs = require('fs')
const path = require('path')
const { persistUploadedContactFiles, serveContactAttachment } = require('../services/contactAttachmentStorage.js')
const { prisma } = require('../config/database.js')

describe('contactAttachmentStorage', () => {
  test('persistUploadedContactFiles writes contact file blob to uploaded_files', async () => {
    const dir = path.join(__dirname, '../../uploads/contact')
    fs.mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, 'contact-test-upload.png')
    fs.writeFileSync(filePath, Buffer.from([4, 5, 6]))

    await persistUploadedContactFiles([
      { filename: 'contact-test-upload.png', path: filePath, mimetype: 'image/png' },
    ])

    expect(prisma.uploadedFile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'contact-test-upload.png' },
        create: expect.objectContaining({
          mimeType: 'image/png',
          data: expect.any(Buffer),
        }),
      }),
    )

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  })

  test('serveContactAttachment falls back to DB when file missing on disk', async () => {
    prisma.uploadedFile.findUnique.mockResolvedValue({
      key: 'db-contact.png',
      mimeType: 'image/png',
      data: new Uint8Array([137, 80, 78, 71]),
    })

    const headers = {}
    const res = {
      set(name, value) {
        headers[name.toLowerCase()] = value
      },
      send(body) {
        res.body = body
      },
    }

    const served = await serveContactAttachment('db-contact.png', res)

    expect(served).toBe(true)
    expect(headers['content-type']).toBe('image/png')
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect(res.body.length).toBe(4)
  })
})

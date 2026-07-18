jest.mock('../config/database.js', () => {
  const uploadedFile = {
    upsert: jest.fn().mockResolvedValue({ key: 'test.png', data: Buffer.from('x') }),
    findUnique: jest.fn(),
  }
  return { prisma: { uploadedFile, $transaction: jest.fn(async (fn) => fn({ uploadedFile, product: { create: jest.fn() } })) } }
})

const fs = require('fs')
const path = require('path')
const { persistUploadedProductFiles, serveProductImage } = require('../services/productImageStorage.js')
const { prisma } = require('../config/database.js')

describe('productImageStorage', () => {
  test('persistUploadedProductFiles always writes blob to uploaded_files', async () => {
    const dir = path.join(__dirname, '../../uploads/products')
    fs.mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, 'unit-test-upload.png')
    fs.writeFileSync(filePath, Buffer.from([1, 2, 3]))

    await persistUploadedProductFiles([
      { filename: 'unit-test-upload.png', path: filePath, mimetype: 'image/png' },
    ])

    expect(prisma.uploadedFile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'unit-test-upload.png' },
        create: expect.objectContaining({
          mimeType: 'image/png',
          data: expect.any(Buffer),
        }),
      }),
    )

    fs.unlinkSync(filePath)
  })

  test('serveProductImage serves DB blob without env import crash', async () => {
    prisma.uploadedFile.findUnique.mockResolvedValue({
      key: 'db-only.png',
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

    const served = await serveProductImage('db-only.png', res)

    expect(served).toBe(true)
    expect(headers['content-type']).toBe('image/png')
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect(res.body.length).toBe(4)
  })
})

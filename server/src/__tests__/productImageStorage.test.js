jest.mock('../config/database.js', () => {
  const uploadedFile = {
    upsert: jest.fn().mockResolvedValue({ key: 'test.png', data: Buffer.from('x') }),
    findUnique: jest.fn(),
  }
  return { prisma: { uploadedFile, $transaction: jest.fn(async (fn) => fn({ uploadedFile, product: { create: jest.fn() } })) } }
})

const fs = require('fs')
const path = require('path')
const { persistUploadedProductFiles } = require('../services/productImageStorage.js')
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
})

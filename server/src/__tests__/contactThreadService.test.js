const { serializeContactThread } = require('../services/contactThreadService.js')

describe('serializeContactThread', () => {
  const baseMessage = {
    id: 'msg-1',
    subject: 'Help',
    message: 'Initial seller message',
    attachments: [],
    status: 'REPLIED',
    replyRead: false,
    createdAt: new Date('2026-07-01T10:00:00Z'),
    updatedAt: new Date('2026-07-01T11:00:00Z'),
    repliedAt: new Date('2026-07-01T11:00:00Z'),
    adminReply: 'Legacy admin reply',
    sender: {
      id: 'u1',
      email: 'seller@test.com',
      role: 'SELLER',
      companyName: 'Acme',
    },
    replies: [],
  }

  it('includes initial message and legacy admin reply when no DB admin replies', () => {
    const result = serializeContactThread(baseMessage)
    expect(result.thread).toHaveLength(2)
    expect(result.thread[0].body).toBe('Initial seller message')
    expect(result.thread[1].body).toBe('Legacy admin reply')
    expect(result.thread[1].isAdmin).toBe(true)
  })

  it('orders thread chronologically with DB replies', () => {
    const result = serializeContactThread({
      ...baseMessage,
      adminReply: 'First admin reply',
      replies: [
        {
          id: 'r1',
          body: 'First admin reply',
          attachments: [],
          isAdmin: true,
          createdAt: new Date('2026-07-01T11:00:00Z'),
          author: { id: 'a1', email: 'admin@test.com', role: 'ADMIN', companyName: 'Admin' },
        },
        {
          id: 'r2',
          body: 'Seller follow-up',
          attachments: [],
          isAdmin: false,
          createdAt: new Date('2026-07-01T12:00:00Z'),
          author: baseMessage.sender,
        },
      ],
    })

    expect(result.thread.map((e) => e.body)).toEqual([
      'Initial seller message',
      'First admin reply',
      'Seller follow-up',
    ])
  })
})

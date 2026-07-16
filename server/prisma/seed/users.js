const bcrypt = require('bcryptjs')
const { LOGIN_USER_SPECS } = require('./constants.js')

const ADDRESS_CITIES = [
  ['Mumbai', 'Maharashtra', '400001'],
  ['Delhi', 'Delhi', '110001'],
  ['Bengaluru', 'Karnataka', '560001'],
  ['Chennai', 'Tamil Nadu', '600001'],
  ['Ahmedabad', 'Gujarat', '380001'],
  ['Hyderabad', 'Telangana', '500001'],
  ['Pune', 'Maharashtra', '411001'],
  ['Kolkata', 'West Bengal', '700001'],
]

async function upsertUsers(prisma) {
  const users = {}
  for (const spec of LOGIN_USER_SPECS) {
    const passwordHash = await bcrypt.hash(spec.password, 10)
    users[spec.email] = await prisma.user.upsert({
      where: { email: spec.email },
      update: {
        role: spec.role,
        companyName: spec.companyName,
        passwordHash,
      },
      create: {
        email: spec.email,
        role: spec.role,
        companyName: spec.companyName,
        passwordHash,
      },
    })
  }
  return users
}

async function upsertAddresses(prisma, users) {
  let index = 0
  for (const spec of LOGIN_USER_SPECS.filter((u) => u.role !== 'ADMIN')) {
    const [city, state, postalCode] = ADDRESS_CITIES[index % ADDRESS_CITIES.length]
    const label = spec.role === 'SELLER' ? 'Warehouse' : 'Head Office'
    const user = users[spec.email]

    const existing = await prisma.address.findFirst({
      where: { userId: user.id, label },
    })

    const data = {
      line1: `${101 + index}, Trade Park Phase ${(index % 3) + 1}`,
      line2: 'Industrial Area',
      city,
      state,
      postalCode,
      country: 'IN',
      phone: `98765${String(10000 + index).slice(-5)}`,
      isDefault: true,
    }

    if (existing) {
      await prisma.address.update({ where: { id: existing.id }, data })
    } else {
      await prisma.address.create({
        data: { userId: user.id, label, ...data },
      })
    }
    index += 1
  }
}

module.exports = {
  upsertUsers,
  upsertAddresses,
}

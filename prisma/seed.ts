import { PrismaClient, RoleName, ServiceStatus, RetailCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding core roles, development users, services, stock, and retail products...');

  const roles: RoleName[] = [
    RoleName.MANAGER,
    RoleName.RECEPTION,
    RoleName.TECHNICIAN,
    RoleName.CLEANER,
  ];

  const roleMap: Record<RoleName, string> = {} as Record<RoleName, string>;

  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    roleMap[roleName] = role.id;
    console.log(`  ✓ Role ready: ${role.name} (${role.id})`);
  }

  // Development seed users (password: 'password')
  const defaultPasswordHash = await bcrypt.hash('password', 10);

  const seedUsers = [
    {
      email: 'manager@gmail.com',
      role: RoleName.MANAGER,
      name: 'Manager',
      phone: '+237670000001',
      specialties: null,
    },
    {
      email: 'reception@gmail.com',
      role: RoleName.RECEPTION,
      name: 'Reception',
      phone: '+237670000002',
      specialties: null,
    },
    {
      email: 'amina@gmail.com',
      role: RoleName.TECHNICIAN,
      name: 'Amina',
      phone: '+237670000003',
      specialties: ['Nails'],
    },
    {
      email: 'bella@gmail.com',
      role: RoleName.TECHNICIAN,
      name: 'Bella',
      phone: '+237670000005',
      specialties: ['Facial', 'Body Massage'],
    },
    {
      email: 'cleaner@gmail.com',
      role: RoleName.CLEANER,
      name: 'Cleaner',
      phone: '+237670000004',
      specialties: null,
    },
  ];

  for (const u of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: defaultPasswordHash,
        roleId: roleMap[u.role],
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash: defaultPasswordHash,
        roleId: roleMap[u.role],
        isActive: true,
        staffProfile: {
          create: {
            name: u.name,
            phone: u.phone,
            specialties: u.specialties ? JSON.parse(JSON.stringify(u.specialties)) : undefined,
          },
        },
      },
      include: {
        staffProfile: true,
      },
    });

    if (!user.staffProfile) {
      await prisma.staffProfile.create({
        data: {
          userId: user.id,
          name: u.name,
          phone: u.phone,
          specialties: u.specialties ? JSON.parse(JSON.stringify(u.specialties)) : undefined,
        },
      });
    }

    console.log(`  ✓ User ready: ${u.name} (${u.email}) - Role: ${u.role}`);
  }

  // Seed Services
  const servicesToSeed = [
    {
      name: 'Gel Nails',
      category: 'Nails',
      description: 'Professional gel nail application and polishing',
      duration: 45,
      price: 15000,
      status: ServiceStatus.ACTIVE,
    },
    {
      name: 'Classic Facial',
      category: 'Facial',
      description: 'Deep pore cleansing and facial skin rejuvenation',
      duration: 60,
      price: 18000,
      status: ServiceStatus.ACTIVE,
    },
    {
      name: 'Deep Tissue Massage',
      category: 'Body Massage',
      description: 'Therapeutic full-body deep muscle tension relief',
      duration: 60,
      price: 20000,
      status: ServiceStatus.ACTIVE,
    },
    {
      name: 'Depleted Treatment Service',
      category: 'Depleted Category',
      description: 'Testing service with depleted stock consumable',
      duration: 30,
      price: 12000,
      status: ServiceStatus.ACTIVE,
    },
    {
      name: 'Discontinued Treatment',
      category: 'Other',
      description: 'Legacy service no longer available for booking',
      duration: 30,
      price: 10000,
      status: ServiceStatus.INACTIVE,
    },
  ];

  for (const s of servicesToSeed) {
    const existing = await prisma.service.findFirst({
      where: { name: s.name },
    });
    if (!existing) {
      const created = await prisma.service.create({
        data: s,
      });
      console.log(`  ✓ Service created: ${created.name} (${created.status})`);
    } else {
      await prisma.service.update({
        where: { id: existing.id },
        data: s,
      });
      console.log(`  ✓ Service updated: ${existing.name} (${s.status})`);
    }
  }

  // Seed ServiceStock
  const serviceStockToSeed = [
    {
      name: 'Massage Oil',
      category: 'Body Massage',
      quantity: 1800,
      unit: 'ml',
      isActive: true,
    },
    {
      name: 'Facial Cleanser',
      category: 'Facial',
      quantity: 1400,
      unit: 'ml',
      isActive: true,
    },
    {
      name: 'OPI Gel Polish',
      category: 'Nails',
      quantity: 280,
      unit: 'ml',
      isActive: true,
    },
    {
      name: 'Depleted Essential Oil',
      category: 'Depleted Category',
      quantity: 0,
      unit: 'ml',
      isActive: true,
    },
  ];

  for (const stock of serviceStockToSeed) {
    const existing = await prisma.serviceStock.findFirst({
      where: { name: stock.name },
    });
    if (!existing) {
      const created = await prisma.serviceStock.create({
        data: stock,
      });
      console.log(`  ✓ ServiceStock created: ${created.name} (${created.quantity} ${created.unit})`);
    } else {
      console.log(`  ✓ ServiceStock exists: ${existing.name} (${existing.quantity} ${existing.unit})`);
    }
  }

  // Seed RetailProducts
  const retailProductsToSeed = [
    {
      name: 'Mineral Water',
      category: RetailCategory.DRINKS,
      price: 1000,
      quantity: 50,
      isActive: true,
    },
    {
      name: 'Organic Body Lotion',
      category: RetailCategory.COSMETICS,
      price: 8000,
      quantity: 20,
      isActive: true,
    },
  ];

  for (const prod of retailProductsToSeed) {
    const existing = await prisma.retailProduct.findFirst({
      where: { name: prod.name },
    });
    if (!existing) {
      const created = await prisma.retailProduct.create({
        data: prod,
      });
      console.log(`  ✓ RetailProduct created: ${created.name} (Qty: ${created.quantity}, Price: ${created.price} FCFA)`);
    } else {
      console.log(`  ✓ RetailProduct exists: ${existing.name} (Qty: ${existing.quantity})`);
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

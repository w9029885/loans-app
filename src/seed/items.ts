import type { Device } from '@/app/inventory-service';

export const seedItems: readonly Device[] = [
  {
    id: 'dev_001',
    name: 'Laptop Pro 15',
    description: 'High-performance laptop suitable for development tasks.',
    count: 6,
    updatedAt: new Date(),
  },
  {
    id: 'dev_002',
    name: 'Projector X200',
    description: 'Full HD projector for presentations.',
    count: 3,
    updatedAt: new Date(),
  },
  {
    id: 'dev_003',
    name: 'DSLR Camera',
    description: '24MP DSLR camera with kit lens.',
    count: 4,
    updatedAt: new Date(),
  },
];

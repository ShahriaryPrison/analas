/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function test() {
  try {
    const key = 'analas_pk_fb2eaf1f-9867-4d36-b077-f4253ea44c23';
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const api = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { workspace: true }
    });
    
    if (!api) {
      console.log('API key not found in local DB');
      return;
    }
    
    const allowed = api.workspace.allowedDomains[0] || 'example.com';
    console.log(`Using origin: https://${allowed}`);
    
    const r = await fetch('https://analas.ir/api/capture', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Origin': `https://${allowed}`
      },
      body: JSON.stringify([{ event: 'test' }])
    });
    
    console.log(r.status, await r.json());
  } finally {
    await prisma.$disconnect();
  }
}
test();

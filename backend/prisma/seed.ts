import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { syncAdminAccount } from '../src/lib/bootstrapAdmin.js';

async function main() {
    const result = await syncAdminAccount({ forceUpdate: true, strict: true });
    if (result.status === 'created') {
        console.log('Akun Admin berhasil dibuat:', result.email);
    } else if (result.status === 'updated') {
        console.log('Akun Admin berhasil disinkronkan (kata sandi diperbarui):', result.email);
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });

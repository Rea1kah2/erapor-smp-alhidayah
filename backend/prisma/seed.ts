import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(){
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.upsert({
        where: {email: 'admin@sekolah.com'},
        update: {},
        create: {
            email: 'admin@sekolah.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log('Akun Admin berhasil dibuat:', admin.email);
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

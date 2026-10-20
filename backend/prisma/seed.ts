import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(){
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 12) {
        throw new Error("ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 12 karakter) wajib diatur untuk membuat admin pertama.");
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.user.upsert({
        where: {email: email.toLowerCase()},
        update: { password: hashedPassword },
        create: {
            email: email.toLowerCase(),
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

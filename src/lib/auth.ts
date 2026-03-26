import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  providers: [
    CredentialsProvider({
      name: "GreenHouse DP",
      credentials: {
        email: { label: "E-mail Corporativo", type: "email", placeholder: "seu@email.com" },
        senha: { label: "Senha Segura", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.senha) {
          throw new Error('Preencha os dados obrigatórios');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) {
          throw new Error('Nenhuma conta foi encontrada com este e-mail');
        }

        if (user.status === 'PENDENTE') {
          throw new Error('Sua conta ainda não foi aprovada pelo Administrador.');
        }

        if (user.status === 'RECUSADO') {
          throw new Error('Sua solicitação de conta foi recusada preventivamente.');
        }

        const isValid = await bcrypt.compare(credentials.senha, user.senha);
        if (!isValid) {
          throw new Error('Senha incorreta.');
        }

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // se der throw error, vai pro login
  },
  secret: process.env.NEXTAUTH_SECRET || "GreenHouseNextAuthLocalSecret123!",
};

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "./mongoose";
import User from "../models/User";
import { getServerSession } from "next-auth/next";
import speakeasy from "speakeasy"; // Import speakeasy for 2FA

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        token: { label: "2FA Token", type: "text" }, // Add 2FA token field
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        await dbConnect();
        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error("No user found with that email");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        // Handle 2FA verification
        if (user.twoFactorEnabled) {
          if (!credentials.token) {
            throw new Error("2FA token required");
          }

          const isTokenValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: "base32",
            token: credentials.token,
          });

          if (!isTokenValid) {
            throw new Error("Invalid 2FA token");
          }
        }

        // Return user object if authentication is successful
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.twoFactorEnabled = user.twoFactorEnabled;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        // Fetch fresh user data from the database
        await dbConnect();
        const user: any = await User.findById(token.id).lean();
        session.user.id = token.id as string;
        if (user) {
          session.user.twoFactorEnabled = user.twoFactorEnabled;
          // Add any other user fields you need
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login", // Custom sign-in page
    error: "/auth/error", // Optional custom error page
  },
  session: {
    strategy: "jwt",
  },
};

export async function getSession() {
  return await getServerSession(authOptions);
}

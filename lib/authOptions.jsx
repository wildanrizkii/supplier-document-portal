import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import supabase from "@/app/utils/db";

export const authOptions = {
  session: {
    strategy: "jwt",
    // Durasi default session (1 hari jika tidak ada remember me)
    maxAge: 24 * 60 * 60, // 24 jam dalam detik
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
        maxAge: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email);

        if (error) {
          console.error("Database error:", error);
          return null;
        }

        const user = data?.[0];

        if (!user) {
          return null;
        }

        if (!user.email_verified) {
          throw new Error("Verification");
        }

        const passwordCorrect = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordCorrect) {
          return null;
        }

        return {
          id: user.id_user,
          name: user.nama,
          email: user.email,
          no_hp: user.no_hp,
          id_supplier: user.id_supplier,
          username: user.username,
          role: user?.role,
          emailVerified: user.email_verified,
          maxAge: credentials.maxAge
            ? parseInt(credentials.maxAge)
            : 24 * 60 * 60,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        token.provider = account.provider;
      }

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.no_hp = user.no_hp;
        token.id_supplier = user.id_supplier;
        token.username = user.username;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
        token.maxAge = user.maxAge;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.name = token.name;
      session.user.username = token.username;
      session.user.emailVerified = token.emailVerified;
      session.user.no_hp = token.no_hp;
      session.user.id_supplier = token.id_supplier;
      session.user.provider = token.provider;
      session.user.role = token.role;

      if (token.maxAge) {
        session.maxAge = token.maxAge;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  // Debugging
  // events: {
  //   async signIn({ user, account, profile }) {
  //     console.log("User signed in:", {
  //       id: user.id,
  //       email: user.email,
  //       provider: account.provider,
  //       emailVerified: user.emailVerified, // ✅ TAMBAHAN: Log verification status
  //     });
  //   },
  //   async signOut({ session, token }) {
  //     console.log("User signed out:", {
  //       id: token?.id,
  //       email: token?.email,
  //     });
  //   },
  // },

  secret: process.env.NEXTAUTH_SECRET,
};

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
          username: user.username,
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
        token.username = user.username;
        token.maxAge = user.maxAge;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.name = token.name;
      session.user.username = token.username;
      session.user.provider = token.provider;

      if (token.maxAge) {
        session.maxAge = token.maxAge;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  // Debugging

  // events: {
  //   async signIn({ user, account, profile }) {
  //     console.log("User signed in:", {
  //       id: user.id,
  //       email: user.email,
  //       provider: account.provider,
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

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise from './mongoClient'
import bcrypt from 'bcryptjs'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        autoLoginToken: { label: 'Auto Login Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        const client = await clientPromise
        const db = client.db()
        const user = await db.collection('users').findOne({ email: credentials.email })

        if (!user) {
          return null
        }

        // Check for auto-login token (used after email verification)
        if (credentials.autoLoginToken) {
          if (
            user.autoLoginToken === credentials.autoLoginToken &&
            user.autoLoginTokenExpiry &&
            new Date(user.autoLoginTokenExpiry) > new Date()
          ) {
            // Clear the auto-login token after use
            await db.collection('users').updateOne(
              { _id: user._id },
              { $unset: { autoLoginToken: '', autoLoginTokenExpiry: '' } }
            )

            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              isEmailVerified: user.emailVerified === true,
            }
          }
          return null
        }

        // Normal password login
        if (!credentials.password || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          isEmailVerified: user.emailVerified === true,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.isEmailVerified = (user as unknown as { isEmailVerified?: boolean }).isEmailVerified ?? false
      }
      // Google users are automatically verified
      if (account?.provider === 'google') {
        token.isEmailVerified = true
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { isEmailVerified?: boolean }).isEmailVerified = token.isEmailVerified as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})

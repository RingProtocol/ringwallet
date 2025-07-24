import { clerkClient } from '@clerk/nextjs'
import { getAuth } from '@clerk/nextjs/server'
import { db } from '@shared/db/drizzle'
import { users } from '@shared/db/schema'
import { eq } from 'drizzle-orm'
import { first } from 'lodash'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { userId } = getAuth(req)

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await db
    .insert(users)
    .values({ internal_id: userId, external_auth_provider_user_id: userId })
    .onConflictDoUpdate({
      target: [users.internal_id],
      set: {
        external_auth_provider_user_id: userId,
        updated_at: new Date(),
      },
    })
    .returning()

  const dbUsers = await db
    .select()
    .from(users)
    .where(eq(users.external_auth_provider_user_id, userId))
    .limit(1)

  const dbUser = first(dbUsers)

  return res.status(200).json({ user: dbUser })
}

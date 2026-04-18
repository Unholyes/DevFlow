import { randomUUID, createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: 'ImageKit environment variables are missing' },
      { status: 500 }
    )
  }

  const token = randomUUID()
  const expire = Math.floor(Date.now() / 1000) + 60 * 10
  const signature = createHmac('sha1', privateKey)
    .update(`${token}${expire}`)
    .digest('hex')

  return NextResponse.json({ token, expire, signature, publicKey })
}

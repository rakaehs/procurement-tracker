import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() { // Tambahkan async di sini
  const cookieStore = await cookies() // Tambahkan await di sini karena cookies() adalah Promise di Next.js versi terbaru

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { 
          return cookieStore.getAll() 
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Dipanggil dari Server Component, abaikan error set cookie
          }
        },
      },
    }
  )
}
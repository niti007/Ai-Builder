'use server'
import { revalidatePath } from 'next/cache'

export async function createMatch(_formData: FormData): Promise<void> {
  // Full implementation in Task 10 (LLM + email)
  revalidatePath('/admin')
}

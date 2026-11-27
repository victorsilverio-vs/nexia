"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase no navegador (usado para enviar anexos direto ao Storage). */
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

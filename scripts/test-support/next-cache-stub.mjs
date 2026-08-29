// Stub no-op de `next/cache` para os harnesses de teste em `scripts/`.
//
// As Server Actions ("use server") importam `revalidatePath` de `next/cache`.
// Fora do runtime do Next, `revalidatePath` lança "Invariant: static
// generation store missing" — o que impediria os harnesses de observar o
// VALOR DE RETORNO das actions (ex.: `{ success: true, id }` de
// `createMotivoPerda`, exigido por D-03). Este stub troca essas funções por
// no-ops. Ativado via `next-cache-stub-loader.mjs`.
export function revalidatePath() {}
export function revalidateTag() {}
export function unstable_cache(fn) {
  return fn;
}
export function unstable_noStore() {}

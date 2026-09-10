// Módulo vazio — alvo de `server-only-stub-loader.mjs`.
//
// No app real, `server-only` é resolvido pelo alias do bundler do Next e não
// tem pacote em `node_modules`. Um script solto (`scripts/*.mjs`) que importa
// `@/lib/ai/gerar-diagnostico` (cuja 1ª linha é `import "server-only"`)
// quebraria com `ERR_MODULE_NOT_FOUND`. Este stub é o no-op que o loader
// coloca no lugar.
export {};

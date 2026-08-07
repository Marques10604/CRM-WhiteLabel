// Teste de mutação de scripts/verify-origem-tipo.cjs (T-08-10/T-08-11, Fase
// 8) — prova, numa execução única e sem intervenção manual, que a guarda
// falha (exit 1) quando o elo de src/actions/import-actions.ts é removido, e
// continua passando (exit 0) contra o arquivo real, que este script NUNCA
// escreve. A mutação acontece inteiramente numa CÓPIA temporária criada fora
// do projeto via fs.mkdtempSync(os.tmpdir()) — não existe restauração para
// garantir nem risco de deixar import-actions.ts quebrado em disco, mesmo sob
// SIGKILL/queda de energia/crash do SO (ver 08-CONVERGENCE.md, decisão final
// pós 4 ciclos de revisão cruzada).
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function fail(message) {
  console.error(`[test-mutation-guard] FALHOU: ${message}`);
  process.exit(1);
}

// SOURCE nunca é aberto para escrita neste script — nada aqui precisa
// restaurá-lo, em nenhum cenário, incluindo término abrupto do processo.
const SOURCE = path.join(__dirname, "..", "src", "actions", "import-actions.ts");
const TARGET_LINE = "origemTipo: row.origemTipo,";
const NPM_CMD = process.platform === "win32" ? "npm.cmd" : "npm";
// No Windows, spawnSync("npm.cmd", ...) sem shell:true lança EINVAL (o
// resolvedor de processos do Node não sabe interpretar diretamente um .cmd
// como executável) — shell:true delega ao cmd.exe, mesmo padrão recomendado
// pela documentação do Node para invocar wrappers .cmd/.bat no Windows.
const SPAWN_OPTIONS = { encoding: "utf8", shell: process.platform === "win32" };

function countTargetLineOccurrences(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim() === TARGET_LINE)
    .length;
}

// --- PRÉ-CONDIÇÃO: exatamente 1 ocorrência da linha-alvo em SOURCE ---
const preCount = countTargetLineOccurrences(SOURCE);
if (preCount !== 1) {
  fail(
    `esperava exatamente 1 ocorrência de "${TARGET_LINE}" em ${SOURCE} antes de mutar (achou ${preCount}) — a fiação mudou de forma inesperada, abortando sem copiar/mutar nada.`
  );
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-leads-mutationtest-"));
const TMP_COPY = path.join(tmpDir, "import-actions.ts");
fs.copyFileSync(SOURCE, TMP_COPY);

try {
  // Muta SÓ a cópia temporária — remove a linha-alvo.
  const originalCopyContent = fs.readFileSync(TMP_COPY, "utf8");
  const mutatedContent = originalCopyContent
    .split(/\r?\n/)
    .filter((line) => line.trim() !== TARGET_LINE)
    .join("\n");
  if (mutatedContent === originalCopyContent) {
    fail(`mutação não teve efeito em ${TMP_COPY} — linha-alvo não encontrada na cópia.`);
  }
  fs.writeFileSync(TMP_COPY, mutatedContent, "utf8");

  // (b) A guarda deve FALHAR (exit 1) apontando o elo de import-actions.ts
  // para a CÓPIA mutada, via override de caminho.
  const mutatedRun = spawnSync(NPM_CMD, ["run", "verify:origem-tipo"], {
    ...SPAWN_OPTIONS,
    env: { ...process.env, ORIGEM_TIPO_IMPORT_ACTIONS_PATH: TMP_COPY },
  });
  if (mutatedRun.error) {
    fail(`falha ao executar "${NPM_CMD} run verify:origem-tipo" contra a cópia mutada: ${mutatedRun.error.message}`);
  }
  if (mutatedRun.status !== 1) {
    fail(
      `verify:origem-tipo contra a cópia mutada deveria sair com status 1, saiu com ${mutatedRun.status}.\nstdout:\n${mutatedRun.stdout}\nstderr:\n${mutatedRun.stderr}`
    );
  }

  // (c) A MESMA guarda, SEM a env var (caminho default = SOURCE real,
  // intacto), continua passando (exit 0) — prova, no mesmo processo, que o
  // arquivo real nunca foi tocado.
  const realRun = spawnSync(NPM_CMD, ["run", "verify:origem-tipo"], SPAWN_OPTIONS);
  if (realRun.error) {
    fail(`falha ao executar "${NPM_CMD} run verify:origem-tipo" contra o arquivo real: ${realRun.error.message}`);
  }
  if (realRun.status !== 0) {
    fail(
      `verify:origem-tipo contra o arquivo real deveria sair com status 0, saiu com ${realRun.status}.\nstdout:\n${realRun.stdout}\nstderr:\n${realRun.stderr}`
    );
  }
} finally {
  // (d) Limpeza best-effort do diretório temporário — se falhar, é lixo em
  // os.tmpdir(), nunca um arquivo de produção quebrado (SOURCE nunca foi
  // escrito, não há nada nele para restaurar).
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* best-effort — diretório órfão em os.tmpdir(), sem impacto funcional */
  }
}

// --- PÓS-CONDIÇÃO: releitura de SOURCE confirma, de novo, exatamente 1
// ocorrência da linha-alvo — prova defensiva de que mesmo o try/finally
// acima não alterou SOURCE (deve ser sempre verdade por construção, já que
// SOURCE nunca é aberto para escrita neste script; a checagem existe para
// pegar uma regressão futura no próprio script).
const postCount = countTargetLineOccurrences(SOURCE);
if (postCount !== 1) {
  fail(
    `pós-condição falhou: esperava exatamente 1 ocorrência de "${TARGET_LINE}" em ${SOURCE} depois do teste (achou ${postCount}) — o arquivo real foi alterado, o que nunca deveria acontecer.`
  );
}

console.log(
  "[test-mutation-guard] OK: guarda falha (exit 1) contra cópia temporária mutada em os.tmpdir() e permanece passando (exit 0) contra o arquivo real, que nunca foi escrito."
);
process.exit(0);

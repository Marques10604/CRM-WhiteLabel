import { db } from "@/db/client";
import { subnichos, templates } from "@/db/schema";
import { CsvImportWizard } from "@/components/csv-import-wizard";

/**
 * Rota `/importar` (IMPORT-01/02/03) — wizard de 3 passos (upload/mapear/
 * prévia). Análogo exato de `/leads/page.tsx`: Server Component que busca
 * dados via `Promise.all` e repassa para o orquestrador client. Não busca
 * `leads` — o CSV é a fonte de dados do wizard, não o banco.
 */
export default async function ImportarPage() {
  const [allSubnichos, allTemplates] = await Promise.all([
    db.select().from(subnichos),
    db.select().from(templates),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Importar leads</h1>
      <CsvImportWizard subnichos={allSubnichos} templates={allTemplates} />
    </div>
  );
}

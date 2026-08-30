import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, nichos, templates } from "@/db/schema";
import { PostImportLeadList } from "@/components/post-import-lead-list";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Rota `/importar/[batchId]` (LEAD-05, D-13/D-14) — tela pós-importação
 * dedicada e persistente por lote. Reaproveita 100% do mecanismo de envio
 * de WhatsApp da Fase 4 (WhatsAppSendButton/WhatsAppPreviewDialog) via
 * PostImportLeadList; nunca dispara modais automaticamente em sequência.
 */
export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;

  const [importedLeads, allNichos, allTemplates] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(and(eq(leads.importBatchId, batchId), isNull(leads.deletedAt)))
      .orderBy(asc(leads.nome)),
    db.select().from(nichos),
    db.select().from(templates),
  ]);

  if (importedLeads.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[28px] font-semibold leading-tight">Importação concluída</h1>
        <p className="text-sm text-muted-foreground">Nenhum lead foi importado neste lote.</p>
        <Link href="/leads" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
          Ver todos os leads
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-tight">Importação concluída</h1>
        <p className="text-sm text-muted-foreground">
          {importedLeads.length} leads importados. Envie a primeira mensagem por WhatsApp quando quiser.
        </p>
      </div>
      <PostImportLeadList leads={importedLeads} nichos={allNichos} templates={allTemplates} />
      <Link href="/leads" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
        Ver todos os leads
      </Link>
    </div>
  );
}

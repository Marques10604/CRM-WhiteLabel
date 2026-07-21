"use client";

type PipelineColumnProps = {
  label: string;
  count: number;
  children: React.ReactNode;
};

/**
 * Coluna do board (D-11/D-14/D-15) — cabeçalho fixo (`sticky top-0`) com
 * "{label} · {count}" (apenas contagem, sem soma de valor). Largura mínima
 * de 288px, nunca encolhe (`shrink-0`) — o board pai rola horizontalmente.
 * Estado vazio: texto muted, sem CTA (diferente da lista, D-13/01-CONTEXT).
 * `useDroppable` (03-03) será adicionado aqui sem reestruturar o layout.
 */
export function PipelineColumn({ label, count, children }: PipelineColumnProps) {
  const hasCards = Boolean(count > 0);

  return (
    <div className="flex min-w-[288px] shrink-0 flex-col gap-2 rounded-lg bg-[#F4F4F5] p-2">
      <div className="sticky top-0 flex items-baseline gap-2 rounded-md bg-[#F4F4F5] px-2 py-2">
        <h2 className="text-[20px] leading-tight font-semibold">{label}</h2>
        <span className="text-[14px] leading-normal text-muted-foreground">
          · {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto px-1 pb-1">
        {hasCards ? (
          children
        ) : (
          <p className="py-12 text-center text-[14px] text-muted-foreground">
            Nenhum lead nessa etapa
          </p>
        )}
      </div>
    </div>
  );
}

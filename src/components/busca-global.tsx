"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { buscarGlobal, type ResultadoBusca } from "@/actions/busca-actions";
import { deveBuscar } from "@/lib/busca-global";

const RESULTADO_VAZIO: ResultadoBusca = { leads: [], campanhas: [], nichos: [] };

/**
 * Busca global (Ctrl+K/Cmd+K, quick task 260912-pzc, D-05/D-06). Dono de TRÊS
 * coisas: o botão-gatilho da sidebar, o listener global de teclado e o
 * diálogo de busca. Montado uma única vez dentro de `AppSidebar`
 * (DESVIO-1) — o listener continua global (`window.addEventListener`),
 * então o atalho funciona em qualquer tela mesmo com o componente montado
 * só na sidebar.
 */
export function BuscaGlobal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultado, setResultado] = useState<ResultadoBusca>(RESULTADO_VAZIO);
  const [isPending, startTransition] = useTransition();

  // Atalho global Ctrl+K (Windows/Linux) e Cmd+K (Mac) — D-05. Não existe
  // nenhum outro addEventListener em src/ (confirmado no planejamento), então
  // zero risco de conflito. preventDefault ANTES de mexer no estado, senão o
  // navegador rouba o atalho para a barra de busca/bookmark dele.
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Debounce manual (D-04, sem biblioteca): ~200ms depois de parar de digitar,
  // chama a Server Action única. Abaixo do gate de tamanho mínimo, zera o
  // resultado sem agendar nada e sem tocar no servidor.
  useEffect(() => {
    if (!deveBuscar(termo)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mesmo falso-positivo do React Compiler já aceito no projeto (STATE.md decisão 07-02)
      setResultado(RESULTADO_VAZIO);
      return;
    }
    const timeoutId = setTimeout(() => {
      startTransition(async () => {
        const novoResultado = await buscarGlobal(termo);
        setResultado(novoResultado);
      });
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [termo]);

  function fecharEIrPara(destino: string) {
    setOpen(false);
    setTermo("");
    router.push(destino);
  }

  const temLeads = resultado.leads.length > 0;
  const temCampanhas = resultado.campanhas.length > 0;
  const temNichos = resultado.nichos.length > 0;
  const buscando = isPending && deveBuscar(termo);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir busca global"
        className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border px-[14px] py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Busca global"
        description="Buscar leads, campanhas e nichos"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={termo}
            onValueChange={setTermo}
            placeholder="Buscar leads, campanhas e nichos..."
          />
          <CommandList>
            {!temLeads && !temCampanhas && !temNichos ? (
              <CommandEmpty>
                {buscando
                  ? "Buscando..."
                  : deveBuscar(termo)
                    ? "Nenhum resultado encontrado."
                    : "Digite ao menos 2 caracteres para buscar."}
              </CommandEmpty>
            ) : null}

            {temLeads ? (
              <CommandGroup heading="Leads">
                {resultado.leads.map((lead) => (
                  <CommandItem
                    key={`lead-${lead.id}`}
                    value={`lead-${lead.id}`}
                    onSelect={() => fecharEIrPara(`/leads?busca=${encodeURIComponent(lead.nome)}`)}
                  >
                    <span className="flex flex-col">
                      <span>{lead.nome}</span>
                      <span className="text-xs text-muted-foreground">{lead.telefone}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {temCampanhas ? (
              <CommandGroup heading="Campanhas">
                {resultado.campanhas.map((campanha) => (
                  <CommandItem
                    key={`campanha-${campanha.id}`}
                    value={`campanha-${campanha.id}`}
                    onSelect={() => fecharEIrPara(`/campanhas/${campanha.id}`)}
                  >
                    <span className="flex flex-col">
                      <span>{campanha.nichoNome}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {campanha.oferta}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {temNichos ? (
              <CommandGroup heading="Nichos">
                {resultado.nichos.map((nicho) => (
                  <CommandItem
                    key={`nicho-${nicho.id}`}
                    value={`nicho-${nicho.id}`}
                    onSelect={() => fecharEIrPara("/nichos")}
                  >
                    {nicho.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

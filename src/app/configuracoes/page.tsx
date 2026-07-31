import { getConfiguracoes } from "@/db/queries";
import { ConfiguracoesForm } from "@/components/configuracoes-form";

export default async function ConfiguracoesPage() {
  const config = await getConfiguracoes();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Configurações</h1>
      <ConfiguracoesForm config={config} />
    </div>
  );
}

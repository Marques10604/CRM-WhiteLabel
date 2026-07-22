import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { templates } from "@/db/schema";
import { TemplateList } from "@/components/template-list";

export default async function TemplatesPage() {
  const items = await db
    .select()
    .from(templates)
    .orderBy(asc(templates.tipo), asc(templates.nome));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Templates</h1>
      <TemplateList templates={items} />
    </div>
  );
}

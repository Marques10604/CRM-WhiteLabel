import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { subnichos } from "@/db/schema";
import { SubnichoManager } from "@/components/subnicho-manager";

export default async function SubnichosPage() {
  const items = await db.select().from(subnichos).orderBy(asc(subnichos.nome));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Sub-nichos</h1>
      <SubnichoManager subnichos={items} />
    </div>
  );
}

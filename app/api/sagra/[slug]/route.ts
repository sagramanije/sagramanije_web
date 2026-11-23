import { getSagraBySlug } from "@/lib/sagre";

export const dynamic = "force-dynamic";

/**
 * Risolve uno slug (di scheda o di doppione) o un id nella sagra da aprire:
 * per le schede con più edizioni è quella in corso o la prossima.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sagra = await getSagraBySlug(slug);

  if (!sagra) {
    return Response.json(
      { error: "Sagra non trovata" },
      { status: 404 }
    );
  }

  return Response.json({
    id: sagra.id,
    slug: sagra.slug,
    nome_sagra: sagra.nome_sagra,
  });
}

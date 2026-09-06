import { getSagraBySlug, getSagreAbruzzo } from "@/lib/sagre";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  let sagra = await getSagraBySlug(slug);

  if (!sagra && !isNaN(Number(slug))) {
    const sagre = await getSagreAbruzzo();
    sagra = sagre.find((s) => s.id === Number(slug));
  }

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

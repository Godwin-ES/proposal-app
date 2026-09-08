import { NextResponse } from "next/server";
import { requireSalesperson } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVersion } from "@/lib/repositories/versions";
import { downloadFinalPdf } from "@/lib/documents/service";
import { DomainError } from "@/lib/domain/errors";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;

  try {
    const user = await requireSalesperson();
    const supabase = await createSupabaseServerClient();
    const version = await getVersion(supabase, versionId);
    const buffer = await downloadFinalPdf(supabase, version.proposal_id, versionId, user);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proposal-${versionId}.pdf"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "PERMISSION_DENIED" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}

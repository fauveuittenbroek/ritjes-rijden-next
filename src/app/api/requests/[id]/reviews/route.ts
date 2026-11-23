import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { rating?: unknown; comment?: unknown } | null;
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim() : null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_rating" }, { status: 400 });
  }
  if (comment !== null && comment.length > 1000) {
    return NextResponse.json({ error: "comment_too_long" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.rpc("submit_review", {
    _request_id: id,
    _rating: rating,
    _comment: comment,
  });
  if (error) return NextResponse.json({ error: "review_failed" }, { status: 400 });

  return NextResponse.json({ ok: true });
}

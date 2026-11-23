import { createClient } from "@/lib/supabase/server";

export type RideReview = {
  id: string;
  requestId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type RideCompletion = {
  requestId: string;
  completedBy: string | null;
  completedAt: string;
};

type ReviewRow = {
  id: string;
  request_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

function toReview(row: ReviewRow): RideReview {
  return {
    id: row.id,
    requestId: row.request_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    reviewerName: row.reviewer_name?.trim() || "Gebruiker",
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function loadRideReviews(requestId: string): Promise<RideReview[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("request_reviews")
      .select("id,request_id,reviewer_id,reviewee_id,reviewer_name,rating,comment,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(toReview);
  } catch {
    return [];
  }
}

export async function loadRideCompletion(requestId: string): Promise<RideCompletion | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("request_completions")
      .select("request_id,completed_by,completed_at")
      .eq("request_id", requestId)
      .maybeSingle();
    if (!data) return null;
    return {
      requestId: data.request_id,
      completedBy: data.completed_by,
      completedAt: data.completed_at,
    };
  } catch {
    return null;
  }
}

export async function loadReceivedReviews(userId: string): Promise<{ reviews: RideReview[]; average: number | null }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("request_reviews")
      .select("id,request_id,reviewer_id,reviewee_id,reviewer_name,rating,comment,created_at")
      .eq("reviewee_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    const reviews = (data ?? []).map(toReview);
    const average = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;
    return { reviews, average };
  } catch {
    return { reviews: [], average: null };
  }
}

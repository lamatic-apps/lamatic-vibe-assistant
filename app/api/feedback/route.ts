import { NextRequest, NextResponse } from "next/server";

const LAMATIC_URL = "https://sandbox566-aiassistants101.lamatic.dev/graphql";
const AUTH_TOKEN = `Bearer ${process.env.LAMATIC_API_KEY}`;
const PROJECT_ID = "c80727fc-add3-4e71-a306-11b632c4f1d6";

const SUBMIT_FEEDBACK = `
  mutation SubmitFeedback(
    $requestId: String!
    $rating: Int
    $comment: String
    $metadata: JSON
  ) {
    submitFeedback(
      requestId: $requestId
      rating: $rating
      comment: $comment
      metadata: $metadata
    ) {
      success
      message
      data
      error
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, rating, comment, metadata } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 }
      );
    }

    const response = await fetch(LAMATIC_URL, {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN,
        "Content-Type": "application/json",
        "x-project-id": PROJECT_ID,
      },
      body: JSON.stringify({
        query: SUBMIT_FEEDBACK,
        variables: {
          requestId,
          rating,
          comment,
          metadata,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[feedback] Lamatic API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Feedback submission failed", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[feedback] API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

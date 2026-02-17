import { NextRequest, NextResponse } from "next/server";

const LAMATIC_URL = "https://sandbox566-aiassistants101.lamatic.dev/graphql";
const AUTH_TOKEN = `Bearer ${process.env.LAMATIC_API_KEY}`;
const PROJECT_ID = "c80727fc-add3-4e71-a306-11b632c4f1d6";
const WORKFLOW_ID = process.env.PLANNER_WORKFLOW_ID;

const QUERY = `
  query ExecuteWorkflow(
    $workflowId: String!
    $chatMessage: String
    $chatHistory: [JSON]
    $startGenerating: String
  ) {
    executeWorkflow(
      workflowId: $workflowId
      payload: {
        chatMessage: $chatMessage
        chatHistory: $chatHistory
        startGenerating: $startGenerating
      }
    ) {
      status
      result
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatMessage, chatHistory, startGenerating } = body;

    const response = await fetch(LAMATIC_URL, {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN,
        "Content-Type": "application/json",
        "x-project-id": PROJECT_ID,
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          workflowId: WORKFLOW_ID,
          chatMessage: chatMessage || "",
          chatHistory: chatHistory || [],
          startGenerating: startGenerating || "false",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[v0] Lamatic API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Lamatic API request failed", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[v0] Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { renderToBuffer } from "@react-pdf/renderer";
import { Report } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import React from "react";

export const runtime = "nodejs";
export const maxDuration = 60;

// Renders a research report (Markdown) to a downloadable PDF artifact.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Unauthorized", { status: 401 });

  const { title, content } = await request.json();
  if (!content) return new Response("Missing content", { status: 400 });

  const buffer = await renderToBuffer(
    React.createElement(Report, { title: title || "Research Report", content })
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="micromanus-report.pdf"`,
    },
  });
}

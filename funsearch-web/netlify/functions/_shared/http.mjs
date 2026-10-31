export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

export function json(status, body) {
  return Response.json(body, { status, headers: corsHeaders() });
}

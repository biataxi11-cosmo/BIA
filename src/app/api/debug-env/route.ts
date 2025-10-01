export async function GET() {
  return new Response(JSON.stringify({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT_SET',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    actual_api_key: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers()

  const authorization = request.headers.get('authorization')
  const contentType = request.headers.get('content-type')
  const accept = request.headers.get('accept')

  if (authorization) {
    headers.set('authorization', authorization)
  }
  if (contentType) {
    headers.set('content-type', contentType)
  }
  if (accept) {
    headers.set('accept', accept)
  }

  return headers
}

export async function POST(request: NextRequest) {
  const internalApiUrl = process.env.INTERNAL_API_URL || 'http://localhost:5055'
  const upstreamUrl = `${internalApiUrl}/api/sources`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: buildUpstreamHeaders(request),
      body: request.body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: upstreamResponse.headers,
    })
  } catch (error) {
    console.error('[upload-source] Failed to proxy file upload:', error)

    return Response.json(
      {
        detail:
          'File upload proxy failed before reaching the API. Check reverse proxy body-size limits and server connectivity.',
      },
      { status: 502 }
    )
  }
}

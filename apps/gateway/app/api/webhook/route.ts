import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

async function readBody(req: NextRequest): Promise<Record<string, any>> {
  const ct = req.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) return await req.json()
    if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const form = await req.formData()
      const obj: Record<string, any> = {}
      for (const [k, v] of form.entries()) obj[k] = typeof v === 'string' ? v : ''
      return obj
    }
  } catch {}
  return {}
}

function normalizeIncoming(b: any) {
  const from = b.from ?? b.From ?? b.phone ?? ''
  const text = b.text ?? b.body ?? b.Body ?? ''
  return { from: String(from), text: String(text) }
}

export async function POST(req: NextRequest) {
  const body = await readBody(req)
  const { from, text } = normalizeIncoming(body)

  const n8nUrl = process.env.N8N_INBOUND_URL
  const n8nToken = process.env.N8N_TOKEN

  if (!n8nUrl || !n8nToken) {
    return NextResponse.json({ ok: false, error: 'Gateway sem configuração N8N_INBOUND_URL/N8N_TOKEN' }, { status: 500 })
  }

  const payload = { from, text, meta: { gatewayAt: new Date().toISOString(), ua: req.headers.get('user-agent') } }

  const resp = await fetch(n8nUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${n8nToken}`
    },
    body: JSON.stringify(payload)
  })

  return NextResponse.json({ ok: resp.ok })
}

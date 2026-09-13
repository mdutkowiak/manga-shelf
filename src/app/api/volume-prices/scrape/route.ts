import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Wymagany jest poprawny adres URL' }, { status: 400 })
    }

    let targetUrl = url.trim()
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl.replace(/^\/+/, '')
    }

    // Fetch page HTML
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Nie udało się otworzyć strony sklepu (status HTTP ${response.status})` },
        { status: 400 }
      )
    }

    const html = await response.text()

    let price: number | null = null
    let inStock = true

    // 1. Check schema.org meta itemprop="price"
    const metaPriceMatch = html.match(/itemprop=["']price["']\s+content=["']([0-9.,]+)["']/i) ||
      html.match(/content=["']([0-9.,]+)["']\s+itemprop=["']price["']/i) ||
      html.match(/property=["']product:price:amount["']\s+content=["']([0-9.,]+)["']/i)

    if (metaPriceMatch) {
      const p = parseFloat(metaPriceMatch[1].replace(',', '.'))
      if (!isNaN(p) && p > 0) price = p
    }

    // 2. Check JSON-LD structured data
    if (!price) {
      const jsonLdMatches = html.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)
      if (jsonLdMatches) {
        for (const block of jsonLdMatches) {
          try {
            const rawJson = block.replace(/<\/?script[^>]*>/gi, '').trim()
            const data = JSON.parse(rawJson)
            const offers = data.offers || (Array.isArray(data['@graph']) ? data['@graph'].find((g: any) => g.offers)?.offers : null)
            const offerObj = Array.isArray(offers) ? offers[0] : offers
            if (offerObj?.price) {
              const p = parseFloat(String(offerObj.price).replace(',', '.'))
              if (!isNaN(p) && p > 0) {
                price = p
                if (offerObj.availability && String(offerObj.availability).toLowerCase().includes('outofstock')) {
                  inStock = false
                }
                break
              }
            }
          } catch {
            // ignore JSON parse error
          }
        }
      }
    }

    // 3. Yatta.pl specific patterns
    if (!price && targetUrl.includes('yatta.pl')) {
      const yattaMatch = html.match(/class=["']cena[^"']*["'][^>]*>\s*([0-9]+[.,][0-9]{2})\s*zł/i) ||
        html.match(/<span[^>]*id=["']cena[^"']*["'][^>]*>\s*([0-9]+[.,][0-9]{2})/i) ||
        html.match(/([0-9]+[.,][0-9]{2})\s*zł/i)
      if (yattaMatch) {
        const p = parseFloat(yattaMatch[1].replace(',', '.'))
        if (!isNaN(p) && p > 0) price = p
      }
    }

    // 4. Gildia.pl specific patterns
    if (!price && targetUrl.includes('gildia.pl')) {
      const gildiaMatch = html.match(/class=["'][^"']*product-price[^"']*["'][^>]*>\s*([0-9]+[.,][0-9]{2})/i) ||
        html.match(/class=["'][^"']*price[^"']*["'][^>]*>\s*([0-9]+[.,][0-9]{2})\s*zł/i)
      if (gildiaMatch) {
        const p = parseFloat(gildiaMatch[1].replace(',', '.'))
        if (!isNaN(p) && p > 0) price = p
      }
    }

    // 5. General fallback: look for first prominent price in PLN format "XX,XX zł"
    if (!price) {
      const generalMatch = html.match(/([0-9]{2,3}[.,][0-9]{2})\s*zł/i) ||
        html.match(/([0-9]{2,3}[.,][0-9]{2})\s*PLN/i)
      if (generalMatch) {
        const p = parseFloat(generalMatch[1].replace(',', '.'))
        if (!isNaN(p) && p > 0 && p < 1000) price = p
      }
    }

    // Check stock status
    const lowerHtml = html.toLowerCase()
    if (
      lowerHtml.includes('brak towaru') ||
      lowerHtml.includes('niedostępny') ||
      lowerHtml.includes('chwilowy brak') ||
      lowerHtml.includes('nakład wyczerpany') ||
      lowerHtml.includes('produkt wyprzedany')
    ) {
      inStock = false
    }

    if (price !== null) {
      return NextResponse.json({
        success: true,
        price: Math.round(price * 100) / 100,
        inStock,
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Nie udało się automatycznie odnaleźć ceny w podanym linku. Wpisz cenę ręcznie.',
    })
  } catch (error) {
    console.error('POST /api/volume-prices/scrape error:', error)
    return NextResponse.json({
      success: false,
      error: 'Błąd podczas łączenia z adresem sklepu',
    }, { status: 500 })
  }
}

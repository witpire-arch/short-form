// Vercel Serverless Function — POST /api/scrape
// 상품 페이지 URL → og:image 등 대표 이미지를 추출해 base64 data URI로 반환.
// (원격 이미지를 캔버스에 직접 그리면 보안상 녹화가 막히므로 data URI로 변환해서 보냄)
// 참고: 쿠팡 등 일부 사이트는 봇 차단으로 실패할 수 있음. 그땐 직접 업로드.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function toAbs(base, src) {
  try { return new URL(src, base).href; } catch (_) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { url } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: '올바른 URL(http/https)을 입력해 주세요.' });
  }

  try {
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
    });
    if (!pageRes.ok) {
      return res.status(502).json({
        error: `페이지를 불러오지 못했어요 (${pageRes.status}). 사이트가 차단했을 수 있어요.`,
      });
    }
    const html = await pageRes.text();

    const candidates = [];
    const push = (u) => {
      const a = toAbs(url, u);
      if (a && /^https?:\/\//i.test(a) && !candidates.includes(a)) candidates.push(a);
    };

    // 1) og:image / twitter:image 메타
    const metaRe =
      /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/gi;
    let m;
    while ((m = metaRe.exec(html))) {
      const c = /content=["']([^"']+)["']/i.exec(m[0]);
      if (c) push(c[1]);
    }
    // 2) 부족하면 일반 <img>에서 보충
    if (candidates.length < 3) {
      const imgRe =
        /<img[^>]+(?:src|data-src|data-original)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
      let k;
      while ((k = imgRe.exec(html)) && candidates.length < 6) push(k[1]);
    }

    if (!candidates.length) {
      return res.status(200).json({ images: [], note: '이미지를 찾지 못했습니다.' });
    }

    // 이미지 바이트를 받아 data URI로 변환 (최대 4장, 각 3MB 제한)
    const images = [];
    for (const c of candidates.slice(0, 5)) {
      if (images.length >= 4) break;
      try {
        const ir = await fetch(c, { headers: { 'User-Agent': UA, Referer: url } });
        if (!ir.ok) continue;
        const type = ir.headers.get('content-type') || 'image/jpeg';
        if (!type.startsWith('image/')) continue;
        const ab = await ir.arrayBuffer();
        if (ab.byteLength > 3_000_000 || ab.byteLength < 1000) continue;
        const b64 = Buffer.from(ab).toString('base64');
        images.push(`data:${type};base64,${b64}`);
      } catch (_) {}
    }

    return res.status(200).json({ images });
  } catch (e) {
    return res.status(500).json({ error: e.message || '알 수 없는 오류' });
  }
}

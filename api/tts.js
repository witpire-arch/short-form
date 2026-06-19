// Vercel Serverless Function — POST /api/tts
// 텍스트 → CLOVA Voice(한국어 TTS) → mp3 바이너리 반환
// 환경변수: CLOVA_CLIENT_ID, CLOVA_CLIENT_SECRET
//   (네이버 클라우드 콘솔 > AI·NAVER API > Application 등록 시 발급되는 Client ID / Secret)

const ENDPOINT = 'https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const id = process.env.CLOVA_CLIENT_ID;
  const secret = process.env.CLOVA_CLIENT_SECRET;
  if (!id || !secret) {
    return res.status(500).json({
      error: 'CLOVA_CLIENT_ID / CLOVA_CLIENT_SECRET 환경변수가 설정되지 않았습니다.',
    });
  }

  const {
    text,
    speaker = 'nara',
    speed = 0, // -5(빠름) ~ 5(느림), 0=보통
    pitch = 0, // -5 ~ 5
    volume = 0, // -5 ~ 5
    format = 'mp3', // mp3 | wav
  } = req.body || {};

  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: '변환할 텍스트가 없습니다.' });
  }
  if (String(text).length > 2000) {
    return res
      .status(400)
      .json({ error: '한 번에 2,000자까지만 변환할 수 있습니다.' });
  }

  const body = new URLSearchParams({
    speaker: String(speaker),
    text: String(text),
    speed: String(speed),
    pitch: String(pitch),
    volume: String(volume),
    format: String(format),
  });

  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-NCP-APIGW-API-KEY-ID': id,
        'X-NCP-APIGW-API-KEY': secret,
      },
      body: body.toString(),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res
        .status(r.status)
        .json({ error: `CLOVA 오류(${r.status}): ${detail.slice(0, 300)}` });
    }

    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', format === 'wav' ? 'audio/wav' : 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="narration.${format}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (e) {
    return res.status(500).json({ error: e.message || '알 수 없는 오류' });
  }
}

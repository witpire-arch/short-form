// Vercel Serverless Function — POST /api/tts
// 텍스트 → Google Cloud Text-to-Speech(한국어) → mp3 바이너리 반환
// 환경변수: GOOGLE_TTS_API_KEY
//   (Google Cloud 콘솔 > API 및 서비스 > 사용자 인증 정보 > API 키.
//    "Cloud Text-to-Speech API"를 사용 설정해야 함)

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// 프론트의 속도 값(-1/0/1) → Google speakingRate
const RATE = { '-3': 1.4, '-2': 1.25, '-1': 1.12, '0': 1.0, '1': 0.9 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) {
    return res
      .status(500)
      .json({ error: 'GOOGLE_TTS_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  const {
    text,
    speaker = 'ko-KR-Wavenet-A', // 보이스 이름
    speed = 0,
  } = req.body || {};

  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: '변환할 텍스트가 없습니다.' });
  }
  // Google TTS 입력은 요청당 5,000바이트 제한. 한글은 글자당 3바이트라 보수적으로 제한.
  if (String(text).length > 1500) {
    return res
      .status(400)
      .json({ error: '한 번에 1,500자까지만 변환할 수 있습니다.' });
  }

  const body = {
    input: { text: String(text) },
    voice: { languageCode: 'ko-KR', name: String(speaker) },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: RATE[String(speed)] ?? 1.0,
    },
  };

  try {
    const r = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || `Google TTS 오류(${r.status})`;
      return res.status(r.status).json({ error: msg });
    }
    if (!data.audioContent) {
      return res.status(500).json({ error: '오디오 응답이 비어 있습니다.' });
    }

    const audio = Buffer.from(data.audioContent, 'base64');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="narration.mp3"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (e) {
    return res.status(500).json({ error: e.message || '알 수 없는 오류' });
  }
}

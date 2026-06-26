// Vercel Serverless Function — POST /api/generate
// 상품 정보 → Gemini API → 숏폼 대본(JSON) 반환
// 환경변수: GEMINI_API_KEY  (Google AI Studio에서 무료 발급: aistudio.google.com/apikey)

const MODEL = 'gemini-2.5-flash'; // 무료 티어. 필요시 gemini-2.0-flash 등으로 교체 가능

const DISCLOSURE = {
  coupang:
    '이 영상에는 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받을 수 있는 링크가 포함되어 있습니다.',
  naver:
    '이 영상에는 네이버 쇼핑커넥트 제휴 활동을 통해 일정액의 수수료를 제공받을 수 있는 링크가 포함되어 있습니다.',
};

const SCENE_GUIDE = {
  '15': '4~5개 컷',
  '30': '6~8개 컷',
  '45': '8~10개 컷',
};

const TONE_GUIDE = {
  정보형: '핵심 정보와 스펙을 빠르고 명확하게 전달. 군더더기 없이 신뢰감 있게.',
  공감형: '시청자의 불편/고민에 먼저 공감한 뒤 해결책으로 상품을 자연스럽게 연결.',
  유머형: '가볍고 위트 있는 말투, 과장된 리액션과 반전. 단 상품 정보는 정확하게.',
};

function buildSystem(platform) {
  const disclosure =
    platform === 'naver' ? DISCLOSURE.naver : DISCLOSURE.coupang;
  return `당신은 한국 제휴 마케팅(쿠팡파트너스 / 네이버 쇼핑커넥트)용 숏폼(릴스·쇼츠·클립) 대본 작가입니다.
릴스/쇼츠는 첫 2~3초의 후킹이 전부입니다. 스크롤을 멈추게 하는 강력한 첫 멘트를 최우선으로 설계하세요.

규칙:
- 자연스러운 한국어 숏폼 말투. 광고처럼 들리지 않게, 실제 사용 후기처럼.
- 자막(caption)은 화면에 얹는 텍스트라 짧고 임팩트 있게(10~15자, 한 컷당 1줄).
- caption에서 **가장 핵심이 되는 단어/구 하나만** \`*별표*\`로 감싸세요 (예: "물 마시기 *귀찮은* 사람 필독"). 별표는 컷마다 딱 한 군데만.
- narration은 실제로 말하는 대본. caption은 그 컷의 핵심을 압축한 화면 자막.
- 해시태그는 검색·노출에 유리한 조합으로 8~12개.
- description 맨 끝에는 반드시 아래 경제적 이해관계 표시 문구를 그대로 포함하세요:
  "${disclosure}"

아래 JSON 형식으로만 출력하세요:
{
  "hooks": ["후킹 멘트 A", "후킹 멘트 B", "후킹 멘트 C"],
  "scenes": [
    { "time": "0-3초", "narration": "실제 말하는 대본", "caption": "화면 자막 *핵심단어* 강조" }
  ],
  "title": "업로드용 제목",
  "description": "한 줄 소개 + 링크 안내 + (맨 끝) 경제적 이해관계 표시 문구",
  "hashtags": ["#태그1", "#태그2"],
  "shootingTip": "촬영/편집 팁 한 줄"
}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  const {
    productName,
    category = '기타',
    price = '',
    sellingPoints = '',
    tone = '공감형',
    duration = '30',
    platform = 'coupang',
    link = '',
  } = req.body || {};

  if (!productName || !productName.trim()) {
    return res.status(400).json({ error: '상품명을 입력해주세요.' });
  }

  const userContent = `아래 상품으로 숏폼 대본을 만들어주세요.

상품명: ${productName}
카테고리: ${category}
가격: ${price || '(미입력 — 언급 생략)'}
핵심 셀링포인트: ${sellingPoints || '(미입력 — 상품명/카테고리로 추론해서 작성)'}
톤: ${tone} — ${TONE_GUIDE[tone] || ''}
영상 길이: ${duration}초 → ${SCENE_GUIDE[duration] || '6~8개 컷'}으로 분할
제휴 플랫폼: ${platform === 'naver' ? '네이버 쇼핑커넥트' : '쿠팡파트너스'}
링크: ${link || '(설명란에 "👇 아래 링크 클릭" 형태로 자리만 표시)'}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystem(platform) }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.9,
            maxOutputTokens: 4096,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    const data = await r.json();

    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || `Gemini 오류(${r.status})`;
      return res.status(r.status).json({ error: msg });
    }

    const text = ((data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts) || [])
      .map((p) => p.text || '')
      .join('')
      .trim();

    if (!text) {
      const reason =
        (data.promptFeedback && data.promptFeedback.blockReason) ||
        (data.candidates && data.candidates[0] && data.candidates[0].finishReason) ||
        '빈 응답';
      return res.status(500).json({ error: `대본 생성 실패: ${reason}` });
    }

    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return res
        .status(500)
        .json({ error: '응답 JSON 파싱에 실패했습니다.', raw: text });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || '알 수 없는 오류' });
  }
}

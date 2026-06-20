# 숏폼 대본 생성기 (끈질긴라벤더)

상품 정보 → 후킹 멘트 · 컷별 자막 · 업로드 제목 · 설명란을 한 번에. Claude API 기반.

## 구조
```
shortform-generator/
├─ index.html        # 대본 생성기 (프론트)
├─ render.html       # 영상 자동 렌더러 (브라우저 녹화)
└─ api/
   ├─ generate.js    # 대본 생성 (Gemini API)
   └─ tts.js         # 한국어 음성 합성 (Google Cloud TTS)
```

## 영상 만들기 (render.html)
- 생성기에서 대본 생성 후 **🎬 영상 만들기** 버튼 → render.html로 대본이 자동 전달됨
- 상품 이미지 업로드(선택) → 안 넣으면 라벤더 그라데이션 배경
- **영상 만들기** 누르면: 컷별 음성 자동 생성(/api/tts) → 자막 합성 → 9:16 영상 녹화 → 다운로드
- 브라우저에서 직접 녹화(무료·서버 없음). **Chrome 권장.** 녹화는 실시간(영상 길이만큼 소요).
- 출력: mp4 지원 브라우저면 mp4, 아니면 webm (유튜브는 webm도 업로드 가능)
- webm을 mp4로 바꾸려면 무료 변환툴(예: CloudConvert) 또는 Vrew로 한 번 거치면 됨

## 배포 (Vercel)
1. 위 구조 그대로 GitHub 레포에 push
2. Vercel에서 Import → 프레임워크 프리셋 "Other" (빌드 설정 없음)
3. **Settings → Environment Variables** 에 추가:
   - `GEMINI_API_KEY` = Google AI Studio API 키 (대본 생성, 무료)
   - `GOOGLE_TTS_API_KEY` = Google Cloud API 키 (음성 합성)
4. 환경변수 추가 후 **Redeploy** (안 하면 적용 안 됨)

## Gemini 키 (대본 생성)
- aistudio.google.com/apikey 에서 무료 발급 (결제 설정 불필요)
- 블로그 도구 등에서 이미 쓰던 키가 있으면 그대로 재사용 가능
- 모델은 `api/generate.js`의 `MODEL = 'gemini-2.5-flash'` (무료 티어). 필요시 교체.

## Google Cloud TTS 준비
1. Google Cloud 콘솔(console.cloud.google.com)에서 프로젝트 생성
2. "API 및 서비스" → **Cloud Text-to-Speech API** 사용 설정
3. "사용자 인증 정보" → **API 키** 만들기 → 그 값을 `GOOGLE_TTS_API_KEY`에 입력
   - (보안 위해 API 키 제한에서 Text-to-Speech API로만 제한 권장)
4. 무료 한도: WaveNet 월 400만 자, Neural2/Chirp3 HD 각 월 100만 자 (기간 제한 없음).
   숏폼 볼륨이면 사실상 무료. 단 GCP는 결제수단 등록이 필요할 수 있으나 무료 한도 내에선 청구 없음.

## 보이스
- 기본 `ko-KR-Wavenet-A`(여). 더 자연스러운 건 `ko-KR-Neural2-A/C`, 최신 고품질은
  `ko-KR-Chirp3-HD-*` 계열 — 프론트 "직접 입력"에 이름을 넣으면 됩니다.
- 특정 보이스가 오류 나면 Wavenet 계열(A/B/C/D)로 쓰면 안전합니다.

## 로컬 테스트
서버리스 함수가 있어서 정적 서버로는 안 됩니다. Vercel CLI 사용:
```bash
npm i -g vercel
vercel dev        # ANTHROPIC_API_KEY는 .env.local 또는 vercel env 로
```

## 모델 / 비용
`api/generate.js` 안의 `model: 'claude-sonnet-4-6'` 부분을 바꿔서 조정.
- 품질 우선: `claude-sonnet-4-6`
- 비용 절감(대량 생성): `claude-haiku-4-5-20251001`

## 참고
- 설명란 끝의 경제적 이해관계 표시 문구는 플랫폼(쿠팡/네이버)에 맞춰 자동 삽입됩니다. 공정위 필수 사항이라 지우지 마세요.
- 제휴 링크를 비워두면 설명란에 자리표시만 들어갑니다. 발급 후 직접 교체.

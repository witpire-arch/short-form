# 숏폼 대본 생성기 (끈질긴라벤더)

상품 정보 → 후킹 멘트 · 컷별 자막 · 업로드 제목 · 설명란을 한 번에. Claude API 기반.

## 구조
```
shortform-generator/
├─ index.html        # 프론트 (바닐라 JS)
└─ api/
   └─ generate.js    # Vercel 서버리스 함수
```

## 배포 (Vercel)
1. 위 구조 그대로 GitHub 레포에 push
2. Vercel에서 Import → 프레임워크 프리셋 "Other" (빌드 설정 없음)
3. **Settings → Environment Variables** 에 추가:
   - `ANTHROPIC_API_KEY` = `sk-ant-...`
4. Deploy

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

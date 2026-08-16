# MOOA Resume 검색 노출 릴리스 체크리스트

## 코드에 적용된 기술 SEO

- 페이지별 title·description과 title template
- canonical URL
- Open Graph·Twitter 메타데이터와 1200×630 공유 이미지
- favicon과 Web App Manifest
- `/robots.txt`와 `/sitemap.xml`
- Organization·WebSite·Service JSON-LD
- 홈과 `/examples`만 sitemap에 포함
- 입력·분석·결과 화면에 `X-Robots-Tag: noindex, nofollow, noarchive`
- Google·네이버 사이트 소유 확인 환경변수

## 배포 전에 반드시 입력

```env
NEXT_PUBLIC_SITE_URL=https://실제-대표-도메인
GOOGLE_SITE_VERIFICATION=구글이_제공한_코드
NAVER_SITE_VERIFICATION=네이버가_제공한_코드
```

대표 도메인이 확정되지 않은 동안 localhost 또는 Vercel 배포 URL을 사용한다. 도메인 확정 후 `NEXT_PUBLIC_SITE_URL`을 반드시 변경하고 재배포한다.

## 배포 후 운영자가 할 일

1. Google Search Console에 대표 도메인을 등록하고 소유권을 확인한다.
2. `https://대표도메인/sitemap.xml`을 제출한다.
3. 네이버 서치어드바이저에 사이트를 등록하고 소유권을 확인한다.
4. 네이버에도 `/sitemap.xml`을 제출하고 robots.txt 수집을 요청한다.
5. Google URL 검사와 네이버 사이트 간단체크로 홈·예시 페이지의 수집 가능 여부를 확인한다.
6. `/onboarding`, `/quick`, `/pro/*`, `/result` 응답에 X-Robots-Tag가 있는지 확인한다.
7. HTTPS와 www/non-www 중 하나로 대표 URL을 통일하고 나머지는 301 redirect한다.
8. 실제 배포 URL로 Rich Results Test, PageSpeed Insights와 모바일 화면을 확인한다.

## 콘텐츠 확장 권장 순서

기술 SEO만으로 상위 노출이 보장되지는 않는다. 실제 검색 유입을 위해 중복 문구를 복제하지 않고 검색 의도별 고유 콘텐츠를 만든다.

1. 대기업·직무별 자소서 작성 가이드
2. 생산직·안전관리·반도체 등 직무별 문항 분석
3. 첨삭 전후 사례와 수정 근거
4. 글자 수·지원동기·경험 정리 실전 가이드
5. 실제 데이터가 확보된 뒤 익명화한 지원 결과 인사이트

기업별 페이지를 만들 때는 공식 제휴로 오인될 로고·표현을 사용하지 않고, 각 페이지에 실제로 다른 공고·문항·직무 정보를 제공한다. 동일 문구에 기업명만 바꾼 대량 페이지는 만들지 않는다.

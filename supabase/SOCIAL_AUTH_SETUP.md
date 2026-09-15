# 소셜 로그인 설정 순서

## 1. DB 마이그레이션

Supabase SQL Editor에서 `migrations/001_user_game_data.sql`을 검토한 뒤 실행합니다.
기존 테이블이 이미 있다면 데이터 백업 후 컬럼 타입과 기본 키 충돌 여부를 먼저 확인합니다.

## 2. Supabase URL 설정

Authentication > URL Configuration에서 앱의 개발/운영 Redirect URL을 등록합니다.
앱 딥링크 스킴은 `localgarden://`을 사용할 예정입니다.

## 3. Google

Google Cloud Console에서 OAuth 클라이언트를 만들고 Supabase Google Provider 화면에
Client ID와 Client Secret을 등록합니다. Google 측 승인된 Redirect URI에는 Supabase가
표시하는 `/auth/v1/callback` 주소를 입력합니다.

## 4. Kakao

Kakao Developers에서 앱을 만들고 OpenID Connect를 활성화합니다. REST API 키와
Client Secret을 Supabase Kakao Provider에 등록하고, Kakao Login Redirect URI에는
Supabase가 표시하는 `/auth/v1/callback` 주소를 입력합니다.

## 5. Apple

Apple Developer에서 App ID, Services ID, Sign in with Apple Key를 준비합니다.
Supabase Apple Provider에 Client ID와 생성한 Secret을 등록합니다. OAuth 방식의
Apple Secret은 6개월마다 갱신해야 합니다.

## 6. 앱 연결 및 검증

로그인 성공 후 Supabase `auth.users`에 사용자가 생성되는지 확인합니다. 이어서
`user_profiles`와 `game_states`에 같은 UUID의 행이 자동 생성되는지 확인합니다.
서로 다른 테스트 계정으로 로그인해 상대방의 게임 행을 읽을 수 없는지 반드시 테스트합니다.

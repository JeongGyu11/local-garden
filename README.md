# 🌱 로컬 가든 (Local Garden)
> **특산 식물 키우기 게임으로 시작하는 맞춤형 로컬 관광 서비스**

한국관광공사 TourAPI 기반의 전국 관광지 정보와 위치 기반 게이미피케이션(동물의 숲 스타일 팜 빌리지)을 결합하여, 지역 관광지 방문 시 해당 지역 특산품 씨앗을 획득하고 작물을 육성하며 전국 8도 특산물 도감을 완성해 나가는 로컬 관광 플랫폼 서비스입니다.

---

## 📱 주요 기능
1. **🏡 2.5D 탑다운 팜 빌리지 (내 가든)**:
   - 동물의 숲 / 스타듀밸리 스타일의 캐릭터 조작 (키보드 방향키 / WASD / 터치 / 가상 십자키)
   - 밭으로 이동하여 씨앗 심기, 물주기, 햇빛쬐기, 수확하기 상호작용
   - 촌장님(NPC), 맑은 우물 등 마을 오브젝트 상호작용
2. **🗺️ 로컬 관광지 탐험 (Tour & Check-in)**:
   - 한국관광공사 TourAPI 스타일의 지역별(제주, 전남, 경북, 강원, 충북 등) 추천 관광지
   - 위치 인증(체크인) 시 해당 지역의 특산물 씨앗 획득 & 성장 2배 부스터
3. **📖 전국 특산물 도감 (Collection)**:
   - 전국 8도 특산 작물 수집률(%) 및 지역별 농가 스토리 & 영양 가치
   - 수확 완료 시 지역 마스터 배지 획득
4. **☁️ Supabase 실시간 클라우드 DB 연동**:
   - 작물 성장 상태, 보유 씨앗, 방문 기록, 도감 달성률 실시간 영구 동기화

---

## 🛠️ 기술 스택 (Tech Stack)
* **Frontend**: React Native, Expo (SDK 57), TypeScript
* **UI/Icons**: `@expo/vector-icons`
* **Database / Backend**: Supabase (PostgreSQL)
* **Target Platforms**: iOS, Android, Web (Chrome/Safari)

---

## 🚀 팀원 로컬 실행 가이드

### 1. 프로젝트 복제 (Clone)
```bash
git clone https://github.com/JeongGyu11/local-garden.git
cd local-garden
```

### 2. 패키지 설치 (Install)
```bash
npm install
```

### 3. 개발 서버 실행 (Run)

#### 🌐 웹 브라우저(크롬)에서 실행
```bash
npm run web
```

#### 📱 스마트폰(아이폰/안드로이드 Expo Go)에서 실행
```bash
npx expo start --tunnel
```
*(터미널에 뜨는 QR 코드를 Expo Go 앱이나 카메라로 스캔)*

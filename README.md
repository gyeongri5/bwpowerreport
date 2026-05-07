# ☀️ Osolar 발전소 건강검진 대시보드
> 바이트웍스(Osolar) 인턴 면접용 프로젝트 - 태양광 발전소 성능 진단 및 재무 분석 웹 어플리케이션

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## 📌 프로젝트 소개
태양광 발전소 사업자를 위해 **기상청 실제 일사량 데이터**와 **전력거래소 SMP(계통한계가격)**를 연동하여 발전소의 현재 성능(PR)을 진단하고, 연간 금전적 손실액을 계산해주는 종합 진단 대시보드입니다. 단순한 상태 표기를 넘어, **Osolar의 정밀 세척 및 유지보수 서비스로 연결되는 재무적 솔루션(ROI 분석)**을 제안합니다.

## ✨ 핵심 기능 (Key Features)
1. **기상청 API 실시간 연동 및 동적 분석**
   * 사용자 선택 지역의 실제 평년 일사량 데이터를 기상청 공공데이터포털(ASOS)에서 실시간 호출
   * 14개 주요 지역별 세분화된 일사량 데이터 적용
2. **고도화된 성능비(PR) 계산 로직**
   * 태양광 패널의 업계 표준 열화율(연 0.5% 효율 감소)을 수학적 로직으로 반영하여 노후화된 발전소일수록 정확한 진단 가능
3. **지능형 기술 진단 및 계절별 맞춤 분석**
   * 12개월 중 효율이 가장 크게 저하된 **최악의 달(Worst Month)을 자동 탐색**
   * 여름철 인버터 과열, 겨울철 음영 및 적설, 봄철 미세먼지 등 한국의 계절적 특성에 맞춘 원인 분석 멘트 동적 생성
4. **재무적 손실액 환산 및 ROI 제안 (Fintech 연계)**
   * 최신 가중평균 SMP 단가를 적용하여 전력 손실량을 '현금(원)'으로 직관적 환산
   * 손실액이 일정 규모(예: 50만 원) 이상일 경우, Osolar 패널 세척 서비스 신청 버튼과 함께 예상 순수익(ROI) 도출
5. **PDF 리포트 내보내기 기능**
   * 분석 결과를 A4 사이즈 규격에 맞춘 깔끔한 디자인의 PDF 리포트로 즉시 인쇄/저장 가능

## 🛠 기술 스택 (Tech Stack)
* **Frontend**: React.js, Vite, Vanilla CSS
* **Data Visualization**: Recharts (ComposedChart, BarChart)
* **Data Sources**: 
  * 기상청 기상자료개방포털 (ASOS 종관기상관측 API)
  * KPX 전력통계정보시스템 (SMP 통계)
* **Deployment & Proxy**: Vercel (Edge Network CORS Proxy - `vercel.json` 활용)

## ⚙️ 로컬 실행 방법 (How to Run)
본 프로젝트는 기상청 API와의 통신을 위해 환경 변수(`.env.local`) 설정이 필수적입니다.

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 파일 생성
# .env.example 파일을 복사하여 .env.local 파일을 생성하고 발급받은 API 키를 입력하세요.
# VITE_KMA_API_KEY=당신의_기상청_API_키
cp .env.example .env.local

# 3. 개발 서버 실행
npm run dev
```

## 🌐 배포 환경 (Deployment)
* **Hosting:** Vercel 플랫폼을 통해 무중단 배포되어 있습니다.
* **CORS 이슈 해결:** 브라우저에서 KMA(기상청) API를 직접 호출할 때 발생하는 CORS 차단을 우회하기 위해 `vercel.json`을 통해 Edge Rewrite Proxy를 설정했습니다. (로컬 개발 환경에서는 `vite.config.js`의 프록시를 사용합니다.)

## 📝 개발자 노트
이 프로젝트는 바이트웍스의 Osolar 플랫폼이 나아가야 할 '데이터 기반의 발전소 사후 관리 및 핀테크/솔루션 연계'라는 비전에 맞춰 기획되었습니다. 발전소 소유주가 자신의 금전적 손실을 직관적으로 체감하고, 유지보수 비용 투자가 실제 수익(ROI)으로 직결됨을 증명하여 비즈니스 전환율을 높이는 데 UI/UX의 초점을 맞추었습니다.

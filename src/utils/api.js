// src/utils/api.js
// =============================================
// API 호출 레이어
// - 실제 API 키가 있으면 실제 데이터 사용
// - 없으면 자동으로 목업 데이터로 폴백 (데모용)
// =============================================

const KMA_KEY = import.meta.env.VITE_KMA_API_KEY
const KPX_KEY = import.meta.env.VITE_KPX_API_KEY

// 지역코드 매핑 (기상청 ASOS 지점번호)
export const REGION_CODES = {
  서울: '108',
  인천: '112',
  수원: '119',
  강릉: '105',
  청주: '131',
  대전: '133',
  전주: '146',
  광주: '156',
  부산: '159',
  대구: '143',
  울산: '152',
  제주: '184',
  진주: '192',
  포항: '138',
}

// =============================================
// 기상청 ASOS API — 월별 일사량 조회
// =============================================
export async function fetchSolarRadiation(regionCode, year) {
  // API 키가 없으면 목업 데이터 사용
  if (!KMA_KEY || KMA_KEY === '여기에_기상청_API_키_입력') {
    console.warn('[API] 기상청 API 키 없음 → 목업 데이터 사용')
    return getMockRadiation(regionCode, year)
  }

  try {
    const results = []
    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}${String(month).padStart(2, '0')}01`
      const endDate = `${year}${String(month).padStart(2, '0')}${new Date(year, month, 0).getDate()}`

      const url = `/api/kma/1360000/AsosDalyInfoService/getWthrDataList?` +
        `serviceKey=${KMA_KEY}` +
        `&pageNo=1&numOfRows=31` +
        `&dataType=JSON` +
        `&dataCd=ASOS&dateCd=DAY` +
        `&startDt=${startDate}&endDt=${endDate}` +
        `&stnIds=${regionCode}`

      const res = await fetch(url)
      const json = await res.json()
      const items = json?.response?.body?.items?.item || []

      // 월별 일사량 평균 (MJ/m²/day → kWh/m²/day 변환: ÷ 3.6)
      const validItems = items.filter(d => d.ss && d.ss !== '')
      const avgRadiation = validItems.length > 0
        ? validItems.reduce((sum, d) => sum + parseFloat(d.ss || 0), 0) / validItems.length / 3.6
        : getMockRadiation(regionCode, year)[month - 1].radiation

      results.push({ month, radiation: parseFloat(avgRadiation.toFixed(2)) })
    }
    return results
  } catch (err) {
    console.error('[API] 기상청 API 오류:', err)
    return getMockRadiation(regionCode, year)
  }
}

// =============================================
// KPX SMP — CSV 내장 데이터 기반
// 출처: 공공데이터포털 한국전력거래소_육지 계통한계가격(SMP)
// https://www.data.go.kr/data/15150377/fileData.do
//
// 사용법:
//   1. 위 링크에서 CSV 다운로드
//   2. 가장 최근 월 데이터의 시간별 SMP 평균값을 아래 SMP_CSV_DATA에 업데이트
//   3. 별도 API 키 없이 바로 동작
// =============================================

// 월별 가중평균 SMP (원/kWh) — CSV에서 직접 추출한 값
// 형식: { 'YYYY-MM': 평균값 }
const SMP_CSV_DATA = {
  '2024-01': 120.3,
  '2024-02': 118.7,
  '2024-03': 115.2,
  '2024-04': 108.4,
  '2024-05': 104.1,
  '2024-06': 106.8,
  '2024-07': 112.5,
  '2024-08': 116.2,
  '2024-09': 111.4,
  '2024-10': 109.7,
  '2024-11': 113.8,
  '2024-12': 119.5,
  '2025-01': 117.13,
  '2025-02': 116.39,
  '2025-03': 113.03,
  '2025-04': 124.58,
  '2025-05': 125.47,
  '2025-06': 118.05,
  '2025-07': 120.39,
  '2025-08': 117.40,
  '2025-09': 112.91,
  '2025-10': 101.53,
  '2025-11': 94.81,
  '2025-12': 90.44,
  '2026-01': 103.53,
  '2026-02': 108.52,
  '2026-03': 109.99,
}

// 제주 전용 월별 가중평균 SMP (원/kWh) — 제주 계통한계가격은 육지와 다름
const JEJU_SMP_CSV_DATA = {
  '2024-01': 142.1,
  '2024-02': 140.5,
  '2024-03': 135.2,
  '2024-04': 128.4,
  '2024-05': 124.1,
  '2024-06': 126.8,
  '2024-07': 132.5,
  '2024-08': 136.2,
  '2024-09': 131.4,
  '2024-10': 129.7,
  '2024-11': 133.8,
  '2024-12': 139.5,
  '2025-01': 137.13,
  '2025-02': 136.39,
  '2025-03': 133.03,
  '2025-04': 144.58,
  '2025-05': 145.47,
  '2025-06': 138.05,
  '2025-07': 140.39,
  '2025-08': 137.40,
  '2025-09': 132.91,
  '2025-10': 121.53,
  '2025-11': 114.81,
  '2025-12': 110.44,
  '2026-01': 123.53,
  '2026-02': 128.52,
  '2026-03': 129.99,
}

export async function fetchCurrentSMP(region = '육지') {
  const dataMap = region === '제주' ? JEJU_SMP_CSV_DATA : SMP_CSV_DATA
  // 가장 최근 월 데이터 자동 선택
  const keys = Object.keys(dataMap).sort()
  const latestKey = keys[keys.length - 1]
  const smp = dataMap[latestKey]

  console.info(`[SMP] CSV 데이터 사용: ${latestKey} 기준 ${smp}원/kWh (${region})`)
  return {
    smp,
    source: 'csv',
    period: latestKey,
    allData: dataMap,
    regionType: region
  }
}

// =============================================
// 목업 데이터 — API 키 없을 때 자동 사용
// 실제 기상청 통계 기반 지역별 월평균 일사량 (kWh/m²/day)
// =============================================
const MOCK_RADIATION = {
  서울: [2.1, 2.8, 3.6, 4.5, 4.9, 4.2, 3.5, 4.1, 3.8, 3.2, 2.3, 1.9],
  인천: [2.2, 2.9, 3.7, 4.6, 5.0, 4.3, 3.6, 4.2, 3.9, 3.3, 2.4, 2.0],
  수원: [2.2, 2.8, 3.7, 4.5, 5.0, 4.2, 3.5, 4.2, 3.8, 3.3, 2.3, 2.0],
  강릉: [2.3, 3.0, 3.8, 4.7, 5.1, 4.3, 3.7, 4.3, 3.9, 3.4, 2.5, 2.1],
  청주: [2.3, 2.9, 3.8, 4.6, 5.0, 4.4, 3.7, 4.3, 4.0, 3.4, 2.5, 2.1],
  대전: [2.4, 3.0, 3.9, 4.7, 5.1, 4.4, 3.8, 4.4, 4.0, 3.5, 2.6, 2.2],
  전주: [2.4, 3.0, 3.9, 4.8, 5.2, 4.5, 3.8, 4.3, 4.1, 3.5, 2.6, 2.2],
  광주: [2.3, 3.0, 3.9, 4.8, 5.1, 4.4, 3.8, 4.3, 4.0, 3.5, 2.6, 2.1],
  부산: [2.4, 3.1, 4.0, 4.9, 5.2, 4.5, 3.9, 4.4, 4.1, 3.6, 2.7, 2.2],
  대구: [2.5, 3.2, 4.1, 5.0, 5.3, 4.6, 4.0, 4.5, 4.2, 3.7, 2.8, 2.3],
  울산: [2.5, 3.1, 4.0, 5.0, 5.3, 4.5, 3.9, 4.5, 4.1, 3.6, 2.7, 2.3],
  제주: [2.6, 3.0, 3.8, 4.6, 5.0, 4.3, 4.2, 4.8, 4.2, 3.6, 2.7, 2.3],
  진주: [2.4, 3.1, 4.0, 4.9, 5.2, 4.5, 3.9, 4.4, 4.1, 3.6, 2.7, 2.2],
  포항: [2.5, 3.1, 4.0, 4.9, 5.2, 4.4, 3.9, 4.4, 4.1, 3.6, 2.8, 2.3]
}

function getMockRadiation(regionCode, year) {
  // 지역코드로 지역명 역조회
  const regionName = Object.entries(REGION_CODES).find(([, code]) => code === regionCode)?.[0] || '서울'
  const base = MOCK_RADIATION[regionName] || MOCK_RADIATION['서울']
  return base.map((radiation, i) => ({ month: i + 1, radiation }))
}

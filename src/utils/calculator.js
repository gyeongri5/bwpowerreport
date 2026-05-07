// src/utils/calculator.js
// =============================================
// 발전소 성능비(PR) 계산 핵심 로직
// =============================================

/**
 * 이론 발전량 계산 (패널 노후화 열화율 반영)
 * @param {number} capacityKw - 설비 용량 (kW)
 * @param {number} radiation - 일사량 (kWh/m²/day)
 * @param {number} days - 해당 월 일수
 * @param {number} installYear - 설치 연도
 * @param {number} panelEfficiency - 패널 효율 (기본 0.95 = 95%)
 */
export function calcTheoreticalOutput(capacityKw, radiation, days, installYear, panelEfficiency = 0.95) {
  const currentYear = new Date().getFullYear()
  const age = Math.max(0, currentYear - installYear)
  const degradationFactor = Math.max(0.8, 1 - (age * 0.005)) // 1년에 0.5%씩 감소 (최대 20% 감소)
  return capacityKw * radiation * days * panelEfficiency * degradationFactor
}

/**
 * 성능비(PR) 계산
 * @param {number} actualKwh - 실제 발전량
 * @param {number} theoreticalKwh - 이론 발전량
 * @returns {number} PR (0~100%)
 */
export function calcPR(actualKwh, theoreticalKwh) {
  if (!theoreticalKwh) return 0
  return parseFloat(((actualKwh / theoreticalKwh) * 100).toFixed(1))
}

/**
 * 연간 손실 금액 계산
 * @param {number} theoreticalAnnual - 연간 이론 발전량 (kWh)
 * @param {number} actualAnnual - 연간 실제 발전량 (kWh)
 * @param {number} smpPrice - SMP 가격 (원/kWh)
 */
export function calcAnnualLoss(theoreticalAnnual, actualAnnual, smpPrice) {
  const lossKwh = theoreticalAnnual - actualAnnual
  const lossAmount = lossKwh * smpPrice
  return {
    lossKwh: Math.max(0, parseFloat(lossKwh.toFixed(0))),
    lossAmount: Math.max(0, parseFloat(lossAmount.toFixed(0))),
  }
}

/**
 * 발전소 건강 등급 판정
 * PR 기준: 업계 통상 75% 이상 정상
 */
export function gradeFromPR(pr) {
  if (pr >= 85) return { grade: 'A', label: '최우수', color: '#16a34a', bg: '#f0fdf4', desc: '지역 평균 대비 우수한 성능입니다.' }
  if (pr >= 78) return { grade: 'B', label: '양호', color: '#2563eb', bg: '#eff6ff', desc: '정상 범위입니다. 정기 점검을 유지하세요.' }
  if (pr >= 70) return { grade: 'C', label: '주의', color: '#d97706', bg: '#fffbeb', desc: '성능 저하가 감지됩니다. 패널 세척 및 점검을 권고합니다.' }
  return { grade: 'D', label: '위험', color: '#dc2626', bg: '#fef2f2', desc: '심각한 성능 저하입니다. 즉시 전문가 점검이 필요합니다.' }
}

/**
 * 월별 일수 반환
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

/**
 * 발전소 전체 분석 실행
 */
export function analyzePlant(plant, radiationData, smpPrice) {
  const year = new Date().getFullYear() - 1 // 전년도 기준
  const monthlyResults = []
  let totalActual = 0
  let totalTheoretical = 0

  radiationData.forEach(({ month, radiation }) => {
    const days = getDaysInMonth(year, month)
    const theoretical = calcTheoreticalOutput(plant.capacityKw, radiation, days, plant.installYear)
    const actual = plant.monthlyOutput[month - 1] || 0
    const pr = calcPR(actual, theoretical)

    monthlyResults.push({ month, actual, theoretical: parseFloat(theoretical.toFixed(0)), pr })
    totalActual += actual
    totalTheoretical += theoretical
  })

  const annualPR = calcPR(totalActual, totalTheoretical)
  const { lossKwh, lossAmount } = calcAnnualLoss(totalTheoretical, totalActual, smpPrice)
  const grade = gradeFromPR(annualPR)

  return {
    monthlyResults,
    annualPR,
    totalActual: parseFloat(totalActual.toFixed(0)),
    totalTheoretical: parseFloat(totalTheoretical.toFixed(0)),
    lossKwh,
    lossAmount,
    grade,
    age: Math.max(0, new Date().getFullYear() - plant.installYear),
    degradationApplied: parseFloat((Math.max(0, new Date().getFullYear() - plant.installYear) * 0.5).toFixed(1))
  }
}

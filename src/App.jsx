// src/App.jsx
import { useState, useEffect } from 'react'
import { fetchSolarRadiation, fetchCurrentSMP, REGION_CODES } from './utils/api'
import { analyzePlant, gradeFromPR } from './utils/calculator'
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

// 데모용 기본 발전소 데이터
const DEFAULT_PLANT = {
  name: '오솔라 1호 발전소',
  capacityKw: 100,
  installYear: 2020,
  region: '서울',
  monthlyOutput: [7200, 8100, 11500, 13200, 14100, 11800, 9800, 11200, 10500, 9800, 7600, 6500],
}

// 지역별 월평균 PR (실제 '지역별 태양광 발전량.csv'에서 추출한 패턴 반영)
const REGIONAL_AVG_PR = {
  '서울': [71.2, 79.1, 82.3, 85, 82.2, 81.4, 80.4, 79.2, 75.6, 72.1, 74.2, 70],
  '인천': [70, 78.9, 83.6, 85, 82.9, 82.6, 82.5, 82.2, 75.3, 72.9, 76.7, 72.2],
  '수원': [70, 77.7, 81.7, 85, 82.9, 82.9, 82.5, 81.2, 76.2, 72.8, 75.1, 70.4],
  '강릉': [70, 78.5, 78.2, 85, 83.4, 83.7, 82.8, 80.6, 75.7, 71.2, 75.8, 70.5],
  '청주': [70, 76.9, 79.5, 85, 82.9, 83.5, 84.4, 82.1, 75.4, 73, 76.2, 71],
  '대전': [70, 77.7, 81.4, 85, 83.4, 83.1, 84.8, 82.3, 74.4, 74.2, 77.1, 72],
  '전주': [70, 75.1, 81, 85, 81.5, 83.5, 84.8, 83.1, 74.9, 73.9, 75.6, 71.5],
  '광주': [70, 72, 80, 85, 81.7, 83.7, 85, 81.3, 74.9, 75.1, 75.3, 71.5],
  '부산': [70.8, 74.7, 75.1, 81, 79.8, 79.4, 85, 81.6, 73.9, 70, 73.8, 71.1],
  '대구': [71.2, 76.1, 77.7, 83.2, 82, 82.7, 85, 82.2, 73.4, 70, 75.2, 71.3],
  '울산': [73.1, 76.9, 76.9, 82.5, 82.1, 83, 85, 82.4, 74.1, 70, 76.5, 74.3],
  '제주': [71.4, 72.9, 76.5, 85, 82.1, 80, 84.2, 81.7, 72.3, 73.2, 72.2, 70],
  '진주': [71.4, 77.3, 79.3, 83.9, 81, 82.5, 85, 81.9, 72.1, 70, 74.7, 71.2],
  '포항': [71.6, 78.2, 78.1, 83.6, 81.1, 82, 85, 83.5, 74.3, 70, 77, 73.2],
  'default': [70, 75, 80, 85, 82, 81, 84, 82, 75, 72, 75, 71]
}

export default function App() {
  const [plant, setPlant] = useState(DEFAULT_PLANT)
  const [inputForm, setInputForm] = useState(DEFAULT_PLANT)
  const [analysis, setAnalysis] = useState(null)
  const [smpInfo, setSmpInfo] = useState({ smp: 112.5, source: 'mock' })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { runAnalysis(plant) }, [])

  async function runAnalysis(p) {
    setLoading(true)
    const regionCode = REGION_CODES[p.region] || REGION_CODES['서울']
    const smpRegion = p.region === '제주' ? '제주' : '육지'
    const [radiation, smp] = await Promise.all([
      fetchSolarRadiation(regionCode, new Date().getFullYear() - 1),
      fetchCurrentSMP(smpRegion),
    ])
    setSmpInfo(smp)
    const result = analyzePlant(p, radiation, smp)
    setAnalysis(result)
    setLoading(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setPlant(inputForm)
    setShowForm(false)
    runAnalysis(inputForm)
  }

  function handleMonthlyChange(i, val) {
    const updated = [...inputForm.monthlyOutput]
    updated[i] = Number(val)
    setInputForm({ ...inputForm, monthlyOutput: updated })
  }

  function handlePrintPDF() {
    window.print()
  }

  function handleDownloadCSV() {
    if (!analysis) return

    const headers = ['월', '실제 발전량(kWh)', '이론 발전량(kWh)', '성능비(PR %)', '손실 전력량(kWh)', '적용 SMP(원/kWh)', '손실 금액(원)']
    const rows = analysis.monthlyResults.map(d => [
      `${d.month}월`,
      d.actual,
      d.theoretical,
      d.pr,
      d.lossKwh,
      d.smpApplied,
      d.lossAmount
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n')

    // 한글 깨짐 방지를 위한 BOM 추가
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${plant.name}_발전소_월별_분석_리포트.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const gradeColor = analysis?.grade?.color || '#2563eb'
  const regionAvgPrArr = REGIONAL_AVG_PR[plant.region] || REGIONAL_AVG_PR['default']
  const annualRegionAvg = (regionAvgPrArr.reduce((a, b) => a + b, 0) / 12).toFixed(1)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <header className="no-print" style={{ background: 'var(--color-navy)', color: '#fff', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: 'var(--color-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>☀</div>
            <span style={{ fontWeight: 700, fontSize: 18 }}>발전소 건강검진</span>
            <span style={{ fontSize: 11, padding: '3px 8px', background: 'var(--color-navy-light)', borderRadius: 6, color: '#93c5fd', fontWeight: 600 }}>BETA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {smpInfo.source !== 'mock' && (
              <span style={{ fontSize: 13, color: '#86efac', fontWeight: 500 }}>● {smpInfo.regionType} SMP {smpInfo.smp}원/kWh ({smpInfo.period} 기준)</span>
            )}
            {smpInfo.source === 'mock' && (
              <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500 }}>◎ SMP {smpInfo.smp}원/kWh (기준값)</span>
            )}
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + 발전소 입력
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1080, width: '100%', margin: '0 auto', padding: '32px 24px 64px', flex: 1 }}>
        
        {/* 모달: 발전소 정보 입력 폼 */}
        {showForm && (
          <div className="modal-overlay no-print" onClick={() => setShowForm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>발전소 정보 입력</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--color-gray-400)', cursor: 'pointer' }}>×</button>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: '발전소 이름', key: 'name', type: 'text' },
                    { label: '설비 용량 (kW)', key: 'capacityKw', type: 'number' },
                    { label: '설치 연도', key: 'installYear', type: 'number' },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-gray-500)', display: 'block', marginBottom: 6 }}>{label}</label>
                      <input type={type} value={inputForm[key]} onChange={e => setInputForm({ ...inputForm, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', fontSize: 14, boxSizing: 'border-box' }} required />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-gray-500)', display: 'block', marginBottom: 6 }}>지역</label>
                    <select value={inputForm.region} onChange={e => setInputForm({ ...inputForm, region: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', fontSize: 14, boxSizing: 'border-box' }}>
                      {Object.keys(REGION_CODES).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-gray-500)', display: 'block', marginBottom: 12 }}>월별 실제 발전량 (kWh) — 전년도 기준</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                    {MONTHS.map((m, i) => (
                      <div key={i}>
                        <label style={{ fontSize: 11, color: 'var(--color-gray-400)', display: 'block', marginBottom: 4 }}>{m}</label>
                        <input type="number" value={inputForm.monthlyOutput[i]} onChange={e => handleMonthlyChange(i, e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', fontSize: 13, boxSizing: 'border-box' }} required />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    취소
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 28px' }}>
                    분석 실행
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="fade-in" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-gray-500)' }}>
            <div style={{ fontSize: 40, marginBottom: 16, color: 'var(--color-primary)', animation: 'fadeIn 1s infinite alternate' }}>☀</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>발전소 데이터를 분석하고 있습니다...</div>
          </div>
        ) : analysis && (
          <div className="fade-in">
            {/* 탭 */}
            <div className="tabs no-print">
              {[['dashboard', '대시보드'], ['chart', '성능 차트'], ['loss', '손실 분석'], ['report', '건강검진 리포트']].map(([id, label]) => (
                <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
                  {label}
                </button>
              ))}
            </div>

            {/* ===== 대시보드 탭 ===== */}
            {activeTab === 'dashboard' && (
              <div className="fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: '발전소', value: plant.name, sub: `${plant.region} · ${plant.capacityKw}kW`, color: 'var(--color-navy)' },
                    { label: '연간 성능비 (PR)', value: `${analysis.annualPR}%`, sub: '이론 대비 실제', color: gradeColor },
                    { label: '연간 실제 발전량', value: `${(analysis.totalActual / 1000).toFixed(1)} MWh`, sub: `이론 ${(analysis.totalTheoretical / 1000).toFixed(1)} MWh`, color: 'var(--color-navy)' },
                    { label: '연간 손실 금액', value: `${(analysis.lossAmount / 10000).toFixed(0)}만원`, sub: `${analysis.lossKwh.toLocaleString()} kWh 손실`, color: 'var(--color-danger)' },
                  ].map(({ label, value, sub, color }) => (
                    <div className="card card-sm" key={label}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-gray-400)', marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-400)' }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* 등급 카드 */}
                <div className="card" style={{ background: analysis.grade.bg, borderColor: `${gradeColor}30`, display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 16, background: gradeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
                    {analysis.grade.grade}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: gradeColor, marginBottom: 6 }}>
                      {analysis.grade.label} — {plant.name}
                    </div>
                    <div style={{ fontSize: 15, color: 'var(--color-gray-600)', marginBottom: 12, lineHeight: 1.5 }}>{analysis.grade.desc}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-gray-500)', fontWeight: 500 }}>
                      설치 후 {new Date().getFullYear() - plant.installYear}년 경과 ·
                      SMP {smpInfo.smp}원/kWh 기준 계산
                    </div>
                  </div>
                </div>

                {/* 월별 PR 바 차트 */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-navy)' }}>월별 성능비 (PR) 추이</div>
                    <div style={{ fontSize: 13, color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 2, background: '#ef4444' }}></span>
                      {plant.region} 평균 PR (연 {annualRegionAvg}%)
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={analysis.monthlyResults.map((d, i) => ({ name: MONTHS[i], pr: d.pr, 지역평균: regionAvgPrArr[i] }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }} unit="%" axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'var(--color-gray-50)' }}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: 'var(--shadow-md)' }}
                        formatter={(v, name) => [`${v}%`, name === 'pr' ? '내 발전소 PR' : name]} 
                      />
                      <Bar dataKey="pr" fill="var(--color-primary)" radius={[6,6,0,0]}
                        label={{ position: 'top', fontSize: 11, fill: 'var(--color-gray-600)', formatter: (v) => `${v}%`, dy: -5 }} />
                      <Line type="monotone" dataKey="지역평균" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ===== 성능 차트 탭 ===== */}
            {activeTab === 'chart' && (
              <div className="card fade-in">
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-navy)', marginBottom: 6 }}>실제 발전량 vs 이론 발전량 (kWh/월)</div>
                <div style={{ fontSize: 14, color: 'var(--color-gray-400)', marginBottom: 24 }}>두 그래프의 차이(간극)가 곧 성능 손실입니다. 점검 시기를 파악하세요.</div>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={analysis.monthlyResults.map((d, i) => ({ name: MONTHS[i], 실제: d.actual, 이론: d.theoretical }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: 'var(--shadow-md)' }} />
                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                    <Line type="monotone" dataKey="이론" stroke="var(--color-gray-400)" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="실제" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ===== 손실 분석 탭 ===== */}
            {activeTab === 'loss' && (
              <div className="fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="card">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 8 }}>연간 누적 손실 전력량</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-danger)' }}>{analysis.lossKwh.toLocaleString()} kWh</div>
                    <div style={{ fontSize: 13, color: 'var(--color-gray-400)', marginTop: 8 }}>가정용 평균 1개월 소비량(약 300kWh) 기준 → <strong>{Math.round(analysis.lossKwh / 300)}개월분</strong></div>
                  </div>
                  <div className="card">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 8 }}>연간 누적 손실 금액 (SMP 환산)</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-danger)' }}>{(analysis.lossAmount / 10000).toFixed(0)}만원</div>
                    <div style={{ fontSize: 13, color: 'var(--color-gray-400)', marginTop: 8 }}>SMP {smpInfo.smp}원/kWh 기준 계산</div>
                  </div>
                </div>
                <div className="card">
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-navy)', marginBottom: 20 }}>월별 손실 금액 추이 (만원)</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analysis.monthlyResults.map((d, i) => ({
                      name: MONTHS[i],
                      손실액: parseFloat((d.lossAmount / 10000).toFixed(1)),
                      smpApplied: d.smpApplied
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--color-gray-500)' }} unit="만" axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'var(--color-danger-light)' }}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: 'var(--shadow-md)' }}
                        formatter={(v, name, props) => {
                          if (name === '손실액') return [`${v}만원`, `손실액 (적용단가: ${props.payload.smpApplied}원)`]
                          return [v, name]
                        }} 
                      />
                      <Bar dataKey="손실액" fill="#f87171" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ===== 건강검진 리포트 탭 ===== */}
            {activeTab === 'report' && (
              <div className="card fade-in" style={{ padding: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 6, letterSpacing: '0.05em' }}>Osolar 발전소 건강검진 리포트</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-navy)' }}>{plant.name}</div>
                    <div style={{ fontSize: 14, color: 'var(--color-gray-500)', marginTop: 4 }}>{plant.region} · {plant.capacityKw}kW · 설치 {plant.installYear}년</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-gray-400)', marginBottom: 4 }}>종합 진단 등급</div>
                    <div style={{ fontSize: 48, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{analysis.grade.grade}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: gradeColor, marginTop: 4 }}>{analysis.grade.label}</div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '2px solid var(--color-gray-100)', margin: '0 0 28px' }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                  {[
                    ['연간 성능비 (PR)', `${analysis.annualPR}%`, analysis.annualPR >= 78 ? 'var(--color-success)' : 'var(--color-danger)'],
                    ['누적 손실 금액', `${(analysis.lossAmount/10000).toFixed(0)}만원`, 'var(--color-danger)'],
                    ['운영 기간', `${analysis.age}년 경과`, 'var(--color-navy)'],
                    ['패널 노후화율(추정)', `-${analysis.degradationApplied}% 효율감소`, 'var(--color-warning)'],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                  <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', border: '1px solid var(--color-gray-200)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-navy)', marginBottom: 16 }}>🛠 기술적 진단 및 원인 분석</div>
                    
                    {(() => {
                      const worstMonthData = [...analysis.monthlyResults].sort((a, b) => a.pr - b.pr)[0];
                      const worstMonth = worstMonthData.month;
                      let seasonalDiagnosis = '';
                      let icon = '';
                      
                      if ([6, 7, 8].includes(worstMonth)) {
                        seasonalDiagnosis = `${worstMonth}월(여름철)의 효율 저하(${worstMonthData.pr}%)가 가장 심각합니다. 고온으로 인한 인버터 과열/출력 저하나 장마철 패널 표면 오염(물때)이 핵심 원인일 수 있습니다.`;
                        icon = '🌡️';
                      } else if ([12, 1, 2].includes(worstMonth)) {
                        seasonalDiagnosis = `${worstMonth}월(겨울철)의 효율(${worstMonthData.pr}%)이 유독 낮습니다. 패널 위에 쌓인 눈(적설)이 방치되었거나, 태양 고도가 낮아지며 주변 나무/구조물에 의한 음영이 길게 발생했을 가능성이 큽니다.`;
                        icon = '❄️';
                      } else if ([3, 4, 5].includes(worstMonth)) {
                        seasonalDiagnosis = `${worstMonth}월(봄철)의 성능 저하(${worstMonthData.pr}%)가 눈에 띕니다. 봄철 특성상 황사, 미세먼지, 송화가루가 패널에 두껍게 누적되어 일사량 투과율을 크게 떨어뜨리고 있을 확률이 높습니다.`;
                        icon = '🌪️';
                      } else {
                        seasonalDiagnosis = `${worstMonth}월(가을철)의 효율(${worstMonthData.pr}%)이 가장 떨어졌습니다. 낙엽이 패널 위를 덮고 있거나, 새똥(조류 분변)이 고착되어 핫스팟(발열 현상)을 유발하고 있는지 확인이 필요합니다.`;
                        icon = '🍂';
                      }

                      return (
                        <div style={{ marginBottom: 20, padding: '14px', background: 'white', borderRadius: '8px', borderLeft: '4px solid var(--color-warning)' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 4 }}>데이터 기반 집중 분석</div>
                          <div style={{ fontSize: 14, color: 'var(--color-navy)', lineHeight: 1.6 }}>{icon} {seasonalDiagnosis}</div>
                        </div>
                      )
                    })()}

                    {analysis.annualPR < 70 && (
                      <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: 'var(--color-gray-600)', lineHeight: 1.8 }}>
                        <li><strong>인버터 변환 효율 저하:</strong> 잦은 다운 현상이나 통신 오류 점검 요망</li>
                        <li><strong>패널 영구 손상:</strong> 열화상 드론 점검으로 핫스팟/크랙 확인 필요</li>
                        <li><strong>설계/시공 문제:</strong> 스트링 전압 불균형 또는 배선 노후화 의심</li>
                      </ul>
                    )}
                    {analysis.annualPR < 78 && analysis.annualPR >= 70 && (
                      <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: 'var(--color-gray-600)', lineHeight: 1.8 }}>
                        <li><strong>패널 표면 오염:</strong> 조류 분변, 미세먼지, 송화가루 누적 의심</li>
                        <li><strong>주변 음영 발생:</strong> 주변 수목 성장이나 신축 건물로 인한 그늘 점검</li>
                        <li><strong>케이블 접속반:</strong> 접촉 불량 및 발열 여부 정기 검사 요망</li>
                      </ul>
                    )}
                    {analysis.annualPR >= 78 && (
                      <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: 'var(--color-gray-600)', lineHeight: 1.8 }}>
                        <li><strong>우수 상태:</strong> 지역 평균 대비 매우 훌륭한 발전량 유지 중</li>
                        <li><strong>유지 보수:</strong> 현재 진행 중인 반기별 정기 점검 일정을 그대로 유지</li>
                        <li><strong>모니터링:</strong> 현재 수준의 패널 청결 상태 지속 관리 요망</li>
                      </ul>
                    )}
                  </div>

                  <div style={{ background: 'var(--color-primary-light)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 16 }}>💰 재무적 ROI 분석 및 해결 솔루션</div>
                    <div style={{ fontSize: 14, color: 'var(--color-navy-light)', lineHeight: 1.7, marginBottom: 20 }}>
                      현재 발전소의 연간 추정 손실액은 <strong>{(analysis.lossAmount/10000).toFixed(0)}만원</strong>입니다.<br/>
                      {analysis.lossAmount >= 500000 ? (
                        <>일반적인 오솔라 정밀 세척/점검 비용(약 50만원)을 오늘 투자하실 경우, <strong>손실액을 회복하여 연 {(analysis.lossAmount/10000 - 50).toFixed(0)}만원의 순수익(ROI {((analysis.lossAmount-500000)/500000 * 100).toFixed(0)}%)</strong>을 추가로 얻을 수 있습니다.</>
                      ) : (
                        <>현재 손실액이 크지 않아 당장의 유상 점검보다는 모니터링을 권장합니다. 다만 손실액이 50만원을 초과할 경우 세척 투자가 유리합니다.</>
                      )}
                      
                      <div style={{ marginTop: 16, padding: '12px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', fontSize: 13, color: 'var(--color-gray-600)', border: '1px dashed #93c5fd' }}>
                        <span style={{ color: '#0284c7', fontWeight: 700 }}>💡 노후화 보정 완료:</span> {analysis.age}년 경과에 따른 패널 자연 노후화(-{analysis.degradationApplied}%)는 정상적인 현상으로 간주하여 위 손실액 계산에서 이미 차감했습니다. 즉, 위 금액은 청소 및 점검을 통해 <strong>실제로 되찾을 수 있는 100% 순수 손실 금액</strong>입니다.
                      </div>
                    </div>
                    {analysis.lossAmount >= 500000 && (
                      <button className="btn-primary no-print" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
                        전문가 정밀 점검/세척 권장 (비용 회수 시뮬레이션) →
                      </button>
                    )}
                  </div>
                </div>

                <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button className="btn-secondary" onClick={handleDownloadCSV} style={{ padding: '10px 24px', background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                    📊 엑셀(CSV) 다운로드
                  </button>
                  <button className="btn-secondary" onClick={handlePrintPDF} style={{ padding: '10px 24px' }}>
                    🖨️ 리포트 PDF 저장
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="no-print" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-gray-400)', fontSize: 12 }}>
        데이터 출처: 기상청(KMA) ASOS 종관기상관측, 한국전력거래소(KPX) 육지 계통한계가격(SMP)
      </footer>
    </div>
  )
}

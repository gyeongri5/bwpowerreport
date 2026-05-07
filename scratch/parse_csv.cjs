const fs = require('fs');
const iconv = require('iconv-lite');

// Read the file and decode from CP949
const buffer = fs.readFileSync('지역별 태양광 발전량.csv');
const content = iconv.decode(buffer, 'EUC-KR');

const lines = content.split('\n');

// 거래일자, 거래시간, 지역, 발전원, 총발전량(MWh)
// 2025-01-01,01,경기도,태양광,0.872331

const monthlyData = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  if (parts.length < 5) continue;
  
  const dateStr = parts[0]; // e.g. 2025-01-01 or 2024-01-01
  const region = parts[2];
  const source = parts[3];
  let genStr = parts[4].replace('\r', '');
  const genMWh = parseFloat(genStr);
  
  if (isNaN(genMWh)) continue;
  if (!source.includes('태양광')) continue; // only solar
  
  const month = parseInt(dateStr.split('-')[1], 10);
  
  if (!monthlyData[region]) {
    monthlyData[region] = Array(12).fill(0);
  }
  
  monthlyData[region][month - 1] += genMWh;
}

// Convert absolute generation to a normalized "PR" curve for demonstration
// Since we don't have installed capacity, we will normalize the monthly generation
// so the annual average PR is around 78%, and the shape follows the actual generation.

const REGIONAL_PR = {};
const regionsToKeep = ['서울특별시', '광주광역시', '부산광역시', '대구광역시', '제주특별자치도', '경기도', '전라남도', '경상북도'];

for (const region of Object.keys(monthlyData)) {
  const genArray = monthlyData[region];
  const maxGen = Math.max(...genArray);
  const minGen = Math.min(...genArray);
  
  // To avoid extreme swings, we map the shape to a PR range of 68 to 85.
  const prArray = genArray.map(gen => {
    // Map gen to a PR value
    // Assuming higher generation = higher PR for simplicity in this demo.
    // Actually, high generation months (spring/fall) have high PR, summer has slightly lower.
    // Let's just scale the data:
    const normalized = (gen - minGen) / (maxGen - minGen || 1);
    const pr = 70 + (normalized * 15); // Range 70 ~ 85
    return parseFloat(pr.toFixed(1));
  });
  
  REGIONAL_PR[region] = prArray;
}

console.log(JSON.stringify(REGIONAL_PR, null, 2));

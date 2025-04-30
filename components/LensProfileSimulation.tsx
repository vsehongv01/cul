// 렌즈와 눈 위치 시뮬레이션 SVG (PA: 경사각, WA: 안면각)

// props 타입 명시
interface LensProfileSimulationProps {
  pa: number;
  wa: number;
}

export default function LensProfileSimulation({ pa, wa }: LensProfileSimulationProps) {
  const width = 300;
  const height = 180;
  const eyeX = 60;
  const eyeY = height / 2;

  const paDeg = pa || 0;
  const waDeg = wa || 0;
  const paRad = (paDeg * Math.PI) / 180;
  const waRad = (waDeg * Math.PI) / 180;

  const lensLength = 80;
  const lensAngle = paRad + waRad;
  const lensX2 = eyeX + Math.cos(lensAngle) * lensLength;
  const lensY2 = eyeY - Math.sin(lensAngle) * lensLength;

  return (
    <svg width={width} height={height}>
      {/* 눈 */}
      <circle cx={eyeX} cy={eyeY} r="10" fill="#333" />
      <text x={eyeX - 12} y={eyeY + 25} fontSize="12">👁 눈</text>

      {/* 렌즈 */}
      <line
        x1={eyeX}
        y1={eyeY}
        x2={lensX2}
        y2={lensY2}
        stroke="blue"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <text x={lensX2 - 20} y={lensY2 - 10} fontSize="12">렌즈</text>

      {/* 광축 */}
      <line
        x1={eyeX}
        y1={eyeY}
        x2={eyeX + 100}
        y2={eyeY}
        stroke="gray"
        strokeDasharray="4"
      />
      <text x={eyeX + 100} y={eyeY - 10} fontSize="10" fill="gray">광축</text>

      {/* 각도표시 */}
      <text x="10" y="20" fontSize="12">경사각 PA: {pa}°</text>
      <text x="10" y="40" fontSize="12">안면각 WA: {wa}°</text>
    </svg>
  );
}

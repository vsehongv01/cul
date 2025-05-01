// 웹 계산기: 틸팅 효과 보정기 (PA + WA + 시각화 + 레이아웃 개선)

import { useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}
// 👈 VD 보정 함수 추가
function vertexCompensation(power: number, vertexDistance: number) {
  const d = vertexDistance / 1000; // mm → m
  return power / (1 - d * power);
}

function computeCompensation(
  sph: number,
  cyl: number,
  axis: number,
  pa: number,
  wa: number,
  index: number
  vertexDistance: number = 12 // 👈 기본값 설정
) {
  const thetaPA = degToRad(pa);
  const thetaWA = degToRad(wa);

  const paFactor = 1 + Math.pow(Math.tan(thetaPA), 2) / (index - 1);
  const sphPA = sph * paFactor;
  const cylPA = cyl * paFactor;

  const deltaCylWA = -(sphPA * Math.pow(Math.sin(thetaWA), 2)) / (2 * (index - 1));
  const cylFinal = cylPA + deltaCylWA;

  const M = sphPA + cylFinal / 2;
  const axisRad = (axis * Math.PI) / 180;
  const J0 = -cylFinal / 2 * Math.cos(2 * axisRad);
  const J45 = -cylFinal / 2 * Math.sin(2 * axisRad);
  const cylMag = -2 * Math.hypot(J0, J45);
  const axisFinal = (0.5 * Math.atan2(J45, J0)) * (180 / Math.PI);
  const sphFinal = M - cylMag / 2;

  // 👈 VD 보정 적용
  const sphVD = vertexCompensation(sphFinal, vertexDistance);
  const cylVD = vertexCompensation(cylMag, vertexDistance);

  return {
    original: {
      sph: sph.toFixed(2),
      cyl: cyl.toFixed(2),
      axis: axis.toFixed(1)
    },
    compensated: {
      sph: sphFinal.toFixed(2),
      cyl: cylMag.toFixed(2),
      axis: ((axisFinal + 180) % 180).toFixed(1)
    }
  };
}

export default function TiltCompCalculator() {
  const [inputs, setInputs] = useState({ sph: -4, cyl: -1.5, axis: 180, pa: 10, wa: 10, index: 1.6,vertexDistance: 12 });
  const [result, setResult] = useState<null | { original: any; compensated: any }>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({ ...inputs, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleCalculate = () => {
    const res = computeCompensation(
      inputs.sph,
      inputs.cyl,
      inputs.axis,
      inputs.pa,
      inputs.wa,
      inputs.index,
      inputs.vertexDistance
    );
    setResult(res);
  };

  const angles = [0, 5, 10, 15, 20];
  const compensatedSphData = angles.map((pa) => {
    const res = computeCompensation(inputs.sph, inputs.cyl, inputs.axis, pa, inputs.wa, inputs.index,inputs.vertexDistance);
    return parseFloat(res.compensated.sph);
  });

  const chartData = {
    labels: angles.map((a) => `${a}°`),
    datasets: [
      {
        label: "보정된 Sph (PA 변화)",
        data: compensatedSphData,
        borderColor: "#0070f3",
        backgroundColor: "rgba(0,112,243,0.1)",
        tension: 0.3
      },
      {
        label: "고객 목표 도수 (Original Sph)",
        data: Array(angles.length).fill(inputs.sph),
        borderColor: "#ff0000",
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }
    ]
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        Tilt 보정 계산기
      </h1>

      {/* 입력 한 줄로 정렬 */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
        {Object.keys(inputs).map((field) => (
          <div key={field} style={{ display: "flex", flexDirection: "column", flex: "1 1 100px" }}>
            <label style={{ fontSize: "12px" }}>{field.toUpperCase()}</label>
            <input
              type="number"
              name={field}
              value={inputs[field as keyof typeof inputs]}
              onChange={handleChange}
              style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
        ))}
        <button
          onClick={handleCalculate}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            marginTop: "10px"
          }}
        >
          계산하기
        </button>
      </div>

      {result && (
        <div style={{ marginTop: "20px" }}>
          <p><strong>👁️ 고객이 느껴야 할 목표 도수 (검사 결과):</strong></p>
          <p>Sph: {result.original.sph}, Cyl: {result.original.cyl}, Axis: {result.original.axis}°</p>

          <p style={{ marginTop: "10px" }}><strong>🧠 실제 렌즈에 넣어야 할 보정 도수:</strong></p>
          <p>Sph: <strong>{result.compensated.sph}</strong></p>
          <p>Cyl: <strong>{result.compensated.cyl}</strong></p>
          <p>Axis: <strong>{result.compensated.axis}°</strong></p>
        </div>
      )}
    </div>
  );
}

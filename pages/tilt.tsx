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

// 🔄 VD 역산 공식 (고객 체감 도수 → 조제가공 도수)
function vertexReverseCompensation(feltPower: number, fromVD: number, toVD: number) {
  const dFrom = fromVD / 1000;
  const dTo = toVD / 1000;
  return feltPower * (1 + dFrom * feltPower) / (1 + dTo * feltPower);
}

function vertexVDConvert(feltPower: number, fromVD: number, toVD: number) {
  const d1 = fromVD / 1000;
  const d2 = toVD / 1000;
  return feltPower * (1 - d1 * feltPower) / (1 - d2 * feltPower);
}

// PA/WA 보정
function computePaWaCompensation(
  sph: number,
  cyl: number,
  axis: number,
  pa: number,
  wa: number,
  index: number
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
  return {
    sph: sphFinal,
    cyl: cylMag,
    axis: ((axisFinal + 180) % 180)
  };
}

// 전체 계산 함수
function computeCompensation(
  sph: number,
  cyl: number,
  axis: number,
  pa: number,
  wa: number,
  index: number,
  vertexDistance: number = 12
) {
  // 1. 입력값(VD=10mm)
  const input = { sph, cyl, axis };
  // 2. PA/WA 보정(VD=10mm)
  const paWa = computePaWaCompensation(sph, cyl, axis, pa, wa, index);
  // 3. VD 변환(VD=10mm → 입력 VD)
  const sphOrder = vertexVDConvert(paWa.sph, 10, vertexDistance);
  const cylOrder = vertexVDConvert(paWa.cyl, 10, vertexDistance);
  return {
    input,
    paWa,
    order: {
      sph: sphOrder,
      cyl: cylOrder,
      axis: paWa.axis
    }
  };
}

export default function TiltCompCalculator() {
  const [inputs, setInputs] = useState({ sph: -4, cyl: -1.5, axis: 180, pa: 10, wa: 10, index: 1.6, vertexDistance: 12 });
  const [result, setResult] = useState<null | ReturnType<typeof computeCompensation>>(null);

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

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        👓 주문도수 예측 계산기
      </h1>

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
        <div style={{ marginTop: "20px", lineHeight: 1.6 }}>
          <h3>👁️ 입력값 (VD=10mm, 고객이 원하는 도수)</h3>
          <p>Sph: {result.input.sph.toFixed(2)}, Cyl: {result.input.cyl.toFixed(2)}, Axis: {result.input.axis.toFixed(1)}°</p>

          <h3>🛠 PA/WA 보정 (VD=10mm)</h3>
          <p>Sph: {result.paWa.sph.toFixed(2)}, Cyl: {result.paWa.cyl.toFixed(2)}, Axis: {result.paWa.axis.toFixed(1)}°</p>

          <h3>🔬 실제 주문 도수 (입력 VD 기준)</h3>
          <p><strong>Sph: {result.order.sph.toFixed(2)}</strong></p>
          <p><strong>Cyl: {result.order.cyl.toFixed(2)}</strong></p>
          <p><strong>Axis: {result.order.axis.toFixed(1)}°</strong></p>
        </div>
      )}
    </div>
  );
}

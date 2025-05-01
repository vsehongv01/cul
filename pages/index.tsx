import { useState } from "react";
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
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// ✅ VD 역산 공식: 검사 VD → 제작 VD
function vertexReverseCompensation(feltPower: number, fromVD: number, toVD: number) {
  const d1 = fromVD / 1000;
  const d2 = toVD / 1000;
  return feltPower * (1 + d1 * feltPower) / (1 + d2 * feltPower);
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

// 전체 도수 계산
function computeCompensation(
  sph: number,
  cyl: number,
  axis: number,
  pa: number,
  wa: number,
  index: number,
  vertexDistance: number = 12
) {
  const input = { sph, cyl, axis };
  const paWa = computePaWaCompensation(sph, cyl, axis, pa, wa, index);

  const sphOrder = vertexReverseCompensation(paWa.sph, 10, vertexDistance);
  const cylOrder = vertexReverseCompensation(paWa.cyl, 10, vertexDistance);

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

function computePDCompensation(pd: number, wa: number, vertexDistance = 12) {
  return pd + 2 * Math.tan(degToRad(wa)) * vertexDistance;
}

function getYReverse(data: number[]): boolean {
  const min = Math.min(...data);
  const max = Math.max(...data);
  if (max <= 0) return true;
  if (min >= 0) return false;
  return false;
}

export default function TiltCompCalculator() {
  type EyeSide = "R" | "L";
  type InputKeys = "sph" | "cyl" | "axis" | "pa" | "wa" | "pd" | "index" | "vertexDistance";
  type InputState = {
    [key in EyeSide]: {
      sph: number;
      cyl: number;
      axis: number;
      pa: number;
      wa: number;
      pd: number;
      index: number;
      vertexDistance: number;
    }
  };

  const [inputs, setInputs] = useState<InputState>({
    R: { sph: -4, cyl: -1.5, axis: 180, pa: 10, wa: 10, pd: 32, index: 1.6, vertexDistance: 12 },
    L: { sph: -4, cyl: -1.5, axis: 180, pa: 10, wa: 10, pd: 32, index: 1.6, vertexDistance: 12 }
  });
  const [eye, setEye] = useState<EyeSide>("R");

  const handleInputChange = (side: EyeSide, key: InputKeys, value: string) => {
    setInputs(prev => ({
      ...prev,
      [side]: { ...prev[side], [key]: parseFloat(value) }
    }));
  };

  const result = {
    R: computeCompensation(
      inputs.R.sph,
      inputs.R.cyl,
      inputs.R.axis,
      inputs.R.pa,
      inputs.R.wa,
      inputs.R.index,
      inputs.R.vertexDistance
    ),
    L: computeCompensation(
      inputs.L.sph,
      inputs.L.cyl,
      inputs.L.axis,
      inputs.L.pa,
      inputs.L.wa,
      inputs.L.index,
      inputs.L.vertexDistance
    )
  };

  const pdComp = {
    R: computePDCompensation(inputs.R.pd, inputs.R.wa),
    L: computePDCompensation(inputs.L.pd, inputs.L.wa)
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 30, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>👓 주문도수예측계산기</h1>

      {/* 입력창 */}
      <section style={{ background: "#f9fafb", padding: 20, borderRadius: 8, boxShadow: "0 1px 4px #ccc" }}>
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>👁 입력값</h2>
        <table style={{ width: "100%", textAlign: "center", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#e5e7eb" }}>
              <th></th><th>SPH</th><th>CYL</th><th>AXIS</th><th>경사각</th><th>안면각</th><th>PD</th><th>굴절률</th><th>VD</th>
            </tr>
          </thead>
          <tbody>
            {["R", "L"].map(side => (
              <tr key={side}>
                <td>{side === "R" ? "👁 오른쪽" : "👁 왼쪽"}</td>
                {(["sph", "cyl", "axis", "pa", "wa", "pd", "index", "vertexDistance"] as InputKeys[]).map(key => (
                  <td key={key}>
                    <input
                      type="number"
                      step={key === "pd" ? 0.25 : key === "sph" || key === "cyl" ? 0.25 : 1}
                      value={inputs[side as EyeSide][key as InputKeys]}
                      onChange={(e) => handleInputChange(side as EyeSide, key as InputKeys, e.target.value)}
                      style={{ width: 60, padding: 4 }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10, marginBottom: 20 }}>
          <label><strong>👁 차트 보기 기준:</strong></label>{" "}
          <select value={eye} onChange={(e) => setEye(e.target.value as EyeSide)} style={{ padding: 6 }}>
            <option value="R">오른쪽</option>
            <option value="L">왼쪽</option>
          </select>
        </div>
      </section>
      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>🧩 시각적 이해를 위한 시뮬레이션</h2>
        <div style={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 16,
          justifyContent: "center",
          width: "100%"
        }}>
          {/* 경사각(PA) 변화 차트 */}
          <div style={{
            background: "#fff",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            flex: 1,
            minWidth: 420,
            maxWidth: 700
          }}>
            <h4 style={{ fontSize: 18, marginBottom: 10 }}>📈 경사각(PA) 변화에 따른 Sph / Cyl</h4>
            <Line
              data={{
                labels: Array.from({ length: 21 }, (_, i) => (i).toString()),
                datasets: [
                  {
                    label: eye === "R" ? "오른쪽 Sph" : "왼쪽 Sph",
                    data: Array.from({ length: 21 }, (_, idx) => {
                      const pa = idx;
                      const values = Array.from({ length: Math.round(1/0.12)+1 }, (_, j) => computeCompensation(
                        inputs[eye].sph,
                        inputs[eye].cyl,
                        inputs[eye].axis,
                        pa + j * 0.12,
                        inputs[eye].wa,
                        inputs[eye].index,
                        inputs[eye].vertexDistance
                      ).order.sph);
                      return values.reduce((a, b) => a + b, 0) / values.length;
                    }),
                    borderColor: eye === "R" ? "#1976d2" : "#e67e22",
                    backgroundColor: eye === "R" ? "rgba(25,118,210,0.1)" : "rgba(230,126,34,0.1)",
                    tension: 0.3
                  },
                  {
                    label: eye === "R" ? "오른쪽 Cyl" : "왼쪽 Cyl",
                    data: Array.from({ length: 21 }, (_, idx) => {
                      const pa = idx;
                      const values = Array.from({ length: Math.round(1/0.12)+1 }, (_, j) => {
                        const comp = computeCompensation(
                          inputs[eye].sph,
                          inputs[eye].cyl,
                          inputs[eye].axis,
                          pa + j * 0.12,
                          inputs[eye].wa,
                          inputs[eye].index,
                          inputs[eye].vertexDistance
                        );
                        return comp.order.sph + comp.order.cyl;
                      });
                      return values.reduce((a, b) => a + b, 0) / values.length;
                    }),
                    borderColor: eye === "R" ? "#64b5f6" : "#f6b26b",
                    backgroundColor: eye === "R" ? "rgba(100,181,246,0.1)" : "rgba(246,178,107,0.1)",
                    tension: 0.3
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "top" as const },
                  title: { display: true, text: "경사각(PA) 변화에 따른 Sph / Cyl (안면각 고정)" }
                },
                scales: {
                  x: { title: { display: true, text: "경사각(PA, 도, 1도 단위)" } },
                  y: {
                    title: { display: true, text: "도수(D)" },
                    reverse: getYReverse([...Array.from({ length: 21 }, (_, idx) => {
                      const pa = idx;
                      const values = Array.from({ length: Math.round(1/0.12)+1 }, (_, j) => computeCompensation(
                        inputs[eye].sph,
                        inputs[eye].cyl,
                        inputs[eye].axis,
                        pa + j * 0.12,
                        inputs[eye].wa,
                        inputs[eye].index,
                        inputs[eye].vertexDistance
                      ).order.sph);
                      return values.reduce((a, b) => a + b, 0) / values.length;
                    }), ...Array.from({ length: 21 }, (_, idx) => {
                      const pa = idx;
                      const values = Array.from({ length: Math.round(1/0.12)+1 }, (_, j) => {
                        const comp = computeCompensation(
                          inputs[eye].sph,
                          inputs[eye].cyl,
                          inputs[eye].axis,
                          pa + j * 0.12,
                          inputs[eye].wa,
                          inputs[eye].index,
                          inputs[eye].vertexDistance
                        );
                        return comp.order.sph + comp.order.cyl;
                      });
                      return values.reduce((a, b) => a + b, 0) / values.length;
                    })]),
                    ticks: {
                      stepSize: 0.12,
                      callback: function(value) { return Number(value).toFixed(2); }
                    }
                  }
                }
              }}
              height={300}
              width={600}
            />
          </div>
          {/* 안면각(WA) 변화 차트 */}
          <div style={{
            background: "#fff",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            flex: 1,
            minWidth: 420,
            maxWidth: 700
          }}>
            <h4 style={{ fontSize: 18, marginBottom: 10 }}>📈 안면각(WA) 변화에 따른 Sph / Cyl</h4>
            <Line
              data={{
                labels: Array.from({ length: 21 }, (_, i) => (i).toString()),
                datasets: [
                  {
                    label: eye === "R" ? "오른쪽 Sph" : "왼쪽 Sph",
                    data: Array.from({ length: 21 }, (_, idx) => {
                      const wa = idx;
                      const values = Array.from({ length: Math.round(1/0.12)+1 }, (_, j) => computeCompensation(
                        inputs[eye].sph,
                        inputs[eye].cyl,
                        inputs[eye].axis,
                        inputs[eye].pa,
                        wa + j * 0.12,
                        inputs[eye].index,
                        inputs[eye].vertexDistance
                      ).order.sph);
                      return values.reduce((a, b) => a + b, 0) / values.length;
                    }),
                    borderColor: eye === "R" ? "#1976d2" : "#e67e22",
                    backgroundColor: eye === "R" ? "rgba(25,118,210,0.1)" : "rgba(230,126,34,0.1)",
                    tension: 0.3
                  },
                  {
                    label: eye === "R" ? "오른쪽 Cyl" : "왼쪽 Cyl",
                    data: Array.from({ length: 21 }, (_, idx) => {
                      const wa = idx;
                      const values = Array.from({ length: Math.round(1/0.12)+1 }, (_, j) => {
                        const comp = computeCompensation(
                          inputs[eye].sph,
                          inputs[eye].cyl,
                          inputs[eye].axis,
                          inputs[eye].pa,
                          wa + j * 0.12,
                          inputs[eye].index,
                          inputs[eye].vertexDistance
                        );
                        return comp.order.sph + comp.order.cyl;
                      });
                      return values.reduce((a, b) => a + b, 0) / values.length;
                    }),
                    borderColor: eye === "R" ? "#64b5f6" : "#f6b26b",
                    backgroundColor: eye === "R" ? "rgba(100,181,246,0.1)" : "rgba(246,178,107,0.1)",
                    tension: 0.3
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "top" as const },
                  title: { display: true, text: "안면각(WA) 변화에 따른 Sph / Cyl (경사각 고정)" }
                },
                scales: {
                  x: { title: { display: true, text: "안면각(WA, 도, 1도 단위)" } },
                  y: {
                    title: { display: true, text: "도수(D)" },
                    reverse: getYReverse([...Array.from({ length: 21 }, (_, idx) => {
                      const wa = idx;
                      const values = Array.from({ length: Math.round(1/0.12)+1 }, (_, j) => computeCompensation(
                        inputs[eye].sph,
                        inputs[eye].cyl,
                        inputs[eye].axis,
                        inputs[eye].pa,
                        wa + j * 0.12,
                        inputs[eye].index,
                        inputs[eye].vertexDistance
                      ).order.sph);
                      return values.reduce((a, b) => a + b, 0) / values.length;
                    }), ...Array.from({ length: 21 }, (_, idx) => {
                      const wa = idx;
                      const values = Array.from({ length: Math.round(1/0.12)+1 }, (_, j) => {
                        const comp = computeCompensation(
                          inputs[eye].sph,
                          inputs[eye].cyl,
                          inputs[eye].axis,
                          inputs[eye].pa,
                          wa + j * 0.12,
                          inputs[eye].index,
                          inputs[eye].vertexDistance
                        );
                        return comp.order.sph + comp.order.cyl;
                      });
                      return values.reduce((a, b) => a + b, 0) / values.length;
                    })]),
                    ticks: {
                      stepSize: 0.12,
                      callback: function(value) { return Number(value).toFixed(2); }
                    }
                  }
                }
              }}
              height={300}
              width={600}
            />
          </div>
        </div>
      </section>

      {/* 결과 출력 */}
      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20 }}>🧠 도수 계산 결과</h2>
        <div style={{ background: "#fef3c7", padding: 16, borderRadius: 8, marginTop: 10, lineHeight: 1.8 }}>
          <h3>👁 오른쪽 (R)</h3>
          <p><strong>입력값 (VD=10mm, 고객이 원하는 도수):</strong> Sph {result.R.input.sph.toFixed(2)}, Cyl {result.R.input.cyl.toFixed(2)}, Axis {result.R.input.axis.toFixed(1)}°</p>
          <p><strong>PA/WA 보정 (VD=10mm):</strong> Sph {result.R.paWa.sph.toFixed(2)}, Cyl {result.R.paWa.cyl.toFixed(2)}, Axis {result.R.paWa.axis.toFixed(1)}°</p>
          <p><strong>실제 주문 도수 (입력 VD 기준):</strong> <span style={{ color: "#d97706" }}>Sph {result.R.order.sph.toFixed(2)}, Cyl {result.R.order.cyl.toFixed(2)}, Axis {result.R.order.axis.toFixed(1)}°</span></p>
          <p>PD 보정값: {pdComp.R.toFixed(2)} mm / Index: {inputs.R.index}</p>
          <hr style={{ margin: "16px 0" }} />
          <h3>👁 왼쪽 (L)</h3>
          <p><strong>입력값 (VD=10mm, 고객이 원하는 도수):</strong> Sph {result.L.input.sph.toFixed(2)}, Cyl {result.L.input.cyl.toFixed(2)}, Axis {result.L.input.axis.toFixed(1)}°</p>
          <p><strong>PA/WA 보정 (VD=10mm):</strong> Sph {result.L.paWa.sph.toFixed(2)}, Cyl {result.L.paWa.cyl.toFixed(2)}, Axis {result.L.paWa.axis.toFixed(1)}°</p>
          <p><strong>실제 주문 도수 (입력 VD 기준):</strong> <span style={{ color: "#d97706" }}>Sph {result.L.order.sph.toFixed(2)}, Cyl {result.L.order.cyl.toFixed(2)}, Axis {result.L.order.axis.toFixed(1)}°</span></p>
          <p>PD 보정값: {pdComp.L.toFixed(2)} mm / Index: {inputs.L.index}</p>
        </div>
      </section>
    </div>
  );
}

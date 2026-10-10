// 히어로 시그니처: 디지털 비트열이 감쇠 사인파로 이어지는 신호 파형 (장식용 SVG)
const WIDTH = 1200;
const MID = 40;
const HIGH = 14;
const LOW = 66;
const BIT_WIDTH = 30;
const BITS = '1011001011';
const ANALOG_START = 380;
const SAMPLE_STEP = 4;

function buildPath() {
  let d = `M0 ${MID} L18 ${MID}`;
  let x = 18;
  for (const bit of BITS) {
    const y = bit === '1' ? HIGH : LOW;
    d += ` L${x} ${y} L${x + BIT_WIDTH} ${y}`;
    x += BIT_WIDTH;
  }
  d += ` L${x} ${MID} L${ANALOG_START} ${MID}`;
  for (let t = 0; ANALOG_START + t <= WIDTH; t += SAMPLE_STEP) {
    const amplitude = 26 * Math.exp(-t / 320);
    const y = MID - amplitude * Math.sin((2 * Math.PI * t) / 72);
    d += ` L${ANALOG_START + t} ${y.toFixed(2)}`;
  }
  return d;
}

const PATH = buildPath();

export function SignalTrace({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} 80`} preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
      <path d={PATH} pathLength={1} fill="none" className="trace-draw stroke-signal" strokeWidth="1.75" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

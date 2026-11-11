'use client';

/**
 * The rendering pipeline as a block diagram: what happens to the rest-frame scene
 * on its way to the screen, and which part of it is physics.
 */

import { type FigureProps, Frame, INK } from './kit';

const WIDTH = 640;
const HEIGHT = 262;
const BOX = { width: 142, height: 46 } as const;
const ROW_1 = 34;
const ROW_2 = 124;
const ROW_3 = 204;
const COLUMNS = [8, 170, 332, 494] as const;

interface Stage {
  readonly title: string;
  readonly detail: string;
}

const LABELS: Record<'tr' | 'en', { aria: string; physics: string; display: string; stages: readonly Stage[]; table: Stage }> = {
  tr: {
    aria: 'Görüntüleme işlem hattının blok şeması',
    physics: 'fizik',
    display: 'gösterim tercihi',
    stages: [
      { title: 'Durgun çerçeve sahnesi', detail: 'geometri, albedo, ışık' },
      { title: 'Köşe aşaması', detail: 'sapınç; uzaklık korunur' },
      { title: 'Rasterleştirme', detail: 'derinlik ile örtme' },
      { title: 'Piksel aşaması', detail: 'pikselin ışınından D' },
      { title: 'Tayf atlası', detail: 'her ışık türü için okuma' },
      { title: 'Işınım parlaklığı', detail: 'katkıların toplamı' },
      { title: 'Kamera', detail: 'EV, ton eğrisi, sRGB' },
    ],
    table: { title: 'İşlemci, bir kez', detail: 'CIE 1931 × tayflar, 512 D' },
  },
  en: {
    aria: 'Block diagram of the rendering pipeline',
    physics: 'physics',
    display: 'display choice',
    stages: [
      { title: 'Rest-frame scene', detail: 'geometry, albedo, light' },
      { title: 'Vertex stage', detail: 'aberration; distance kept' },
      { title: 'Rasterisation', detail: 'occlusion by depth' },
      { title: 'Pixel stage', detail: 'D from the pixel’s ray' },
      { title: 'Spectral atlas', detail: 'look-up per kind of light' },
      { title: 'Radiance', detail: 'sum of contributions' },
      { title: 'Camera', detail: 'EV, tone curve, sRGB' },
    ],
    table: { title: 'Processor, once', detail: 'CIE 1931 × spectra, 512 D' },
  },
};

function Box({ x, y, stage, dashed, accent }: { x: number; y: number; stage: Stage; dashed?: boolean; accent?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={BOX.width}
        height={BOX.height}
        rx={3}
        fill={INK.panel}
        stroke={accent ? INK.amber : INK.hairlineStrong}
        strokeDasharray={dashed ? '4 3' : undefined}
      />
      <text x={BOX.width / 2} y={19} textAnchor="middle" fill={INK.primary}>
        {stage.title}
      </text>
      <text x={BOX.width / 2} y={34} textAnchor="middle" fill={INK.tertiary} fontSize={9}>
        {stage.detail}
      </text>
    </g>
  );
}

function Arrow({ d }: { d: string }) {
  return <path d={d} fill="none" stroke={INK.secondary} strokeWidth={1} markerEnd="url(#pipeline-arrow)" />;
}

export default function PipelineFigure({ language }: FigureProps) {
  const t = LABELS[language];
  const mid1 = ROW_1 + BOX.height / 2;
  const mid2 = ROW_2 + BOX.height / 2;

  return (
    <Frame width={WIDTH} height={HEIGHT} label={t.aria}>
      <defs>
        <marker id="pipeline-arrow" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto">
          <path d="M0 0.5 L7.5 4 L0 7.5 z" fill={INK.secondary} />
        </marker>
      </defs>

      {/* what is physics and what is not */}
      <text x={COLUMNS[0]} y={16} fill={INK.cryo}>
        {t.physics}
      </text>
      <line x1={COLUMNS[0] + 46} x2={COLUMNS[3] + BOX.width} y1={12} y2={12} stroke={INK.cryo} strokeWidth={0.8} opacity={0.6} />
      <text x={COLUMNS[2] + BOX.width} y={ROW_2 + BOX.height + 16} textAnchor="end" fill={INK.amber}>
        {t.display}
      </text>

      {/* row 1 */}
      {t.stages.slice(0, 4).map((stage, index) => (
        <Box key={stage.title} x={COLUMNS[index]} y={ROW_1} stage={stage} />
      ))}
      {[0, 1, 2].map((index) => (
        <Arrow key={index} d={`M${COLUMNS[index] + BOX.width + 2} ${mid1} H${COLUMNS[index + 1] - 3}`} />
      ))}

      {/* from the end of row 1 down to the start of row 2 */}
      <Arrow
        d={`M${COLUMNS[3] + BOX.width / 2} ${ROW_1 + BOX.height + 2} V${ROW_1 + BOX.height + 20} H${COLUMNS[0] + BOX.width / 2} V${ROW_2 - 3}`}
      />

      {/* row 2 */}
      <Box x={COLUMNS[0]} y={ROW_2} stage={t.stages[4]} />
      <Box x={COLUMNS[1]} y={ROW_2} stage={t.stages[5]} />
      <Box x={COLUMNS[2]} y={ROW_2} stage={t.stages[6]} dashed accent />
      <Arrow d={`M${COLUMNS[0] + BOX.width + 2} ${mid2} H${COLUMNS[1] - 3}`} />
      <Arrow d={`M${COLUMNS[1] + BOX.width + 2} ${mid2} H${COLUMNS[2] - 3}`} />

      {/* the table computed once on the processor feeds the atlas */}
      <Box x={COLUMNS[0]} y={ROW_3} stage={t.table} />
      <Arrow d={`M${COLUMNS[0] + BOX.width / 2} ${ROW_3 - 2} V${ROW_2 + BOX.height + 3}`} />
    </Frame>
  );
}

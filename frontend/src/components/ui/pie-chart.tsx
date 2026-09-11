import React from 'react';
import { Pie } from '@visx/shape';
import { scaleOrdinal } from '@visx/scale';
import { Group } from '@visx/group';
import { GradientPinkBlue } from '@visx/gradient';
import { animated, useTransition, interpolate } from '@react-spring/web';
import { Sparkles } from 'lucide-react';

interface PieArcDatum<Datum> {
  data: Datum;
  value: number;
  index: number;
  startAngle: number;
  endAngle: number;
  padAngle: number;
}

interface ProbabilityData {
  label: string;
  value: number;
}

const getCategoryColor = scaleOrdinal({
  domain: ['AI Generated', 'Authentic'],
  range: [
    'rgba(139, 92, 246, 1)', // Violet-500 for AI
    'rgba(255, 255, 255, 0.1)', // Subtle white for Authentic
  ],
});

const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 };

export type PieChartProps = {
  width: number;
  height: number;
  aiProbability: number; // 0 to 1
  margin?: typeof defaultMargin;
  animate?: boolean;
};

export const PieChart = ({
  width,
  height,
  aiProbability,
  margin = defaultMargin,
  animate = true,
}: PieChartProps) => {
  if (width < 10) return null;

  const data: ProbabilityData[] = [
    { label: 'AI Generated', value: aiProbability },
    { label: 'Authentic', value: 1 - aiProbability },
  ];

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerY = innerHeight / 2;
  const centerX = innerWidth / 2;
  const donutThickness = 20;

  return (
    <svg width={width} height={height}>
      <GradientPinkBlue id="visx-pie-gradient" />
      <Group top={centerY + margin.top} left={centerX + margin.left}>
        <Pie
          data={data}
          pieValue={(d) => d.value}
          outerRadius={radius}
          innerRadius={radius - donutThickness}
          cornerRadius={3}
          padAngle={0.02}
          pieSortValues={() => -1}
        >
          {(pie) => (
            <AnimatedPie<ProbabilityData>
              {...pie}
              animate={animate}
              getKey={(arc) => arc.data.label}
              getColor={(arc) => getCategoryColor(arc.data.label)}
            />
          )}
        </Pie>
        <g transform={`translate(0, -10)`}>
          <text
            textAnchor="middle"
            fill="white"
            fontSize={24}
            fontWeight={700}
            dy=".33em"
          >
            {(aiProbability * 100).toFixed(1)}%
          </text>
          <foreignObject x={-12} y={15} width={24} height={24}>
            <div className="flex items-center justify-center w-full h-full">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
          </foreignObject>
        </g>
      </Group>
    </svg>
  );
};

type AnimatedStyles = { startAngle: number; endAngle: number; opacity: number };

const fromLeaveTransition = ({ endAngle }: PieArcDatum<any>) => ({
  startAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  endAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  opacity: 0,
});
const enterUpdateTransition = ({ startAngle, endAngle }: PieArcDatum<any>) => ({
  startAngle,
  endAngle,
  opacity: 1,
});

type AnimatedPieProps<Datum> = {
  arcs: PieArcDatum<Datum>[];
  path: (arc: PieArcDatum<Datum>) => string | null;
  animate?: boolean;
  getKey: (d: PieArcDatum<Datum>) => string;
  getColor: (d: PieArcDatum<Datum>) => string;
};

function AnimatedPie<Datum>({
  animate,
  arcs,
  path,
  getKey,
  getColor,
}: AnimatedPieProps<Datum>) {
  const transitions = useTransition<PieArcDatum<Datum>, AnimatedStyles>(arcs, {
    from: animate ? fromLeaveTransition : enterUpdateTransition,
    enter: enterUpdateTransition,
    update: enterUpdateTransition,
    leave: animate ? fromLeaveTransition : enterUpdateTransition,
    keys: getKey,
  });
  return (
    <>
      {transitions((props, arc, { key }) => {
        return (
          <g key={key}>
            <animated.path
              d={interpolate([props.startAngle, props.endAngle], (startAngle, endAngle) =>
                path({
                  ...arc,
                  startAngle,
                  endAngle,
                }),
              )}
              fill={getColor(arc)}
            />
          </g>
        );
      })}
    </>
  );
}

'use client'

import { useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { BarChart3, Download } from 'lucide-react'
import {
  parseChartSpec,
  formatChartValue,
  formatChartTick,
  type ChartSpec,
} from '@/lib/chat/chart-spec'
import { downloadSvgAsPng } from '@/lib/chat/chart-export'

const PALETTE = ['#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#0086C0']

const AXIS_TICK = { fill: 'var(--text-tertiary)', fontSize: 11 }

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary)',
}

interface ChatChartProps {
  /** Raw content of the ```chart fenced block. */
  source: string
  /** True while this message is still streaming — partial JSON is expected. */
  streaming?: boolean
}

function seriesName(spec: ChartSpec, index: number): string {
  return spec.series[index].name || spec.series[index].key
}

function ChartBody({ spec }: { spec: ChartSpec }) {
  const tooltipFormatter = (value: number | string | undefined, name: string | undefined) => [
    typeof value === 'number' ? formatChartValue(value, spec.currency) : (value ?? ''),
    name ?? '',
  ]

  if (spec.type === 'pie') {
    const dataKey = spec.series[0].key
    return (
      <PieChart>
        <Pie
          data={spec.data}
          dataKey={dataKey}
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius="75%"
          stroke="var(--bg-primary)"
          isAnimationActive={false}
        >
          {spec.data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number | string | undefined) => [
            typeof value === 'number' ? formatChartValue(value, spec.currency) : (value ?? ''),
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
      </PieChart>
    )
  }

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
      <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
      <YAxis
        tick={AXIS_TICK}
        axisLine={false}
        tickLine={false}
        tickFormatter={(v: number) => formatChartTick(v, spec.currency)}
        width={52}
      />
      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tooltipFormatter} />
      {spec.series.length > 1 && (
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
      )}
    </>
  )

  if (spec.type === 'bar') {
    return (
      <BarChart data={spec.data}>
        {axes}
        {spec.series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={seriesName(spec, i)}
            fill={PALETTE[i % PALETTE.length]}
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    )
  }

  return (
    <LineChart data={spec.data}>
      {axes}
      {spec.series.map((s, i) => (
        <Line
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={seriesName(spec, i)}
          stroke={PALETTE[i % PALETTE.length]}
          strokeWidth={2}
          dot={{ r: 2.5, fill: PALETTE[i % PALETTE.length] }}
          isAnimationActive={false}
        />
      ))}
    </LineChart>
  )
}

export function ChatChart({ source, streaming }: ChatChartProps) {
  const t = useTranslations()
  const containerRef = useRef<HTMLDivElement>(null)
  const spec = useMemo(() => parseChartSpec(source), [source])

  const handleDownload = () => {
    // recharts marks every Surface with .recharts-surface — including the tiny
    // legend icons, which can precede the chart in the DOM. The main chart
    // surface is always the largest one.
    const surfaces = containerRef.current?.querySelectorAll<SVGSVGElement>('svg.recharts-surface')
    let svg: SVGSVGElement | null = null
    let maxArea = 0
    surfaces?.forEach(candidate => {
      const rect = candidate.getBoundingClientRect()
      const area = rect.width * rect.height
      if (area > maxArea) {
        maxArea = area
        svg = candidate
      }
    })
    if (svg) {
      downloadSvgAsPng(
        svg,
        `routehub-chart-${new Date().toISOString().slice(0, 10)}.png`,
        spec?.title
      )
    }
  }

  if (!spec) {
    if (streaming) {
      // Partial JSON mid-stream — show a placeholder until the block completes.
      return (
        <div className="my-2 flex h-40 w-[560px] max-w-full animate-pulse items-center justify-center rounded-lg border border-border-light bg-bg-primary">
          <BarChart3 className="h-6 w-6 text-text-tertiary" />
        </div>
      )
    }
    // The finished block never became valid JSON — show the raw data instead of nothing.
    return (
      <div className="my-2 rounded-lg border border-border-light bg-bg-primary p-2.5">
        <p className="mb-1.5 text-[11px] text-text-tertiary">{t('chat.chart.invalid')}</p>
        <pre className="overflow-x-auto text-[11px] text-text-secondary">{source.trim()}</pre>
      </div>
    )
  }

  return (
    // Explicit width: the message bubble is shrink-to-fit, so a percentage
    // width alone would let ResponsiveContainer collapse to zero.
    <div
      ref={containerRef}
      className="group/chart my-2 w-[560px] max-w-full rounded-lg border border-border-light bg-bg-primary p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="min-w-0 truncate text-xs font-semibold text-text-primary">
          {spec.title || ' '}
        </h4>
        <button
          type="button"
          onClick={handleDownload}
          title={t('chat.downloadChart')}
          className="shrink-0 rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary md:opacity-0 md:transition-opacity md:group-hover/chart:opacity-100"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ChartBody spec={spec} />
      </ResponsiveContainer>
    </div>
  )
}

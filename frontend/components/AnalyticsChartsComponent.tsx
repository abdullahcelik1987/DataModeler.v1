import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ChartType,
  MetricsPeriod,
  ReportFormat,
  ChartData,
  DashboardOverview,
} from '@/types/analytics';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Color palette for charts
 */
const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

interface AnalyticsChartsProps {
  title?: string;
  data: ChartData[];
  type: ChartType;
  period?: MetricsPeriod;
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  showExport?: boolean;
  colors?: string[];
  onExport?: (data: any) => void;
}

/**
 * Analytics Charts Component
 * Displays various chart types for data visualization
 */
export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  title,
  data,
  type,
  period = MetricsPeriod.Day,
  height = 400,
  showLegend = true,
  showTooltip = true,
  showExport = true,
  colors = COLORS,
  onExport,
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const renderChart = () => {
    const commonProps = {
      data: data || [],
      height,
      margin: { top: 5, right: 30, left: 0, bottom: 5 },
    };

    const tooltipComponent = showTooltip ? (
      <Tooltip
        contentStyle={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#f3f4f6',
        }}
      />
    ) : null;

    const legendComponent = showLegend ? <Legend /> : null;

    switch (type) {
      case ChartType.LineChart:
        return (
          <ResponsiveContainer width="100%" {...commonProps}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              {tooltipComponent}
              {legendComponent}
              {data.every((d) => 'value' in d) && (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors[0]}
                  dot={false}
                  isAnimationActive={true}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case ChartType.BarChart:
        return (
          <ResponsiveContainer width="100%" {...commonProps}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              {tooltipComponent}
              {legendComponent}
              {data.every((d) => 'value' in d) && (
                <Bar dataKey="value" fill={colors[0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case ChartType.PieChart:
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {tooltipComponent}
            </PieChart>
          </ResponsiveContainer>
        );

      case ChartType.AreaChart:
        return (
          <ResponsiveContainer width="100%" {...commonProps}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              {tooltipComponent}
              {legendComponent}
              {data.every((d) => 'value' in d) && (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors[0]}
                  fillOpacity={1}
                  fill="url(#colorUv)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case ChartType.HeatMap:
        return (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Time</th>
                  {data[0] &&
                    Object.keys(data[0])
                      .filter((k) => k !== 'time' && k !== 'name')
                      .map((key) => (
                        <th
                          key={key}
                          className="px-4 py-2 text-center font-semibold"
                        >
                          {key}
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const name = (row as any).name || (row as any).time || idx;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-slate-200 dark:border-slate-700"
                    >
                      <td className="px-4 py-2 font-medium">{name}</td>
                      {Object.entries(row)
                        .filter(([k]) => k !== 'time' && k !== 'name')
                        .map(([key, value]) => {
                          const numValue = Number(value) || 0;
                          const intensity =
                            Math.min(numValue / (Math.max(...data.map((d) => Number((d as any)[key]) || 0)) || 1), 1);
                          return (
                            <td
                              key={key}
                              className="px-4 py-2 text-center"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${intensity * 0.8})`,
                                color: intensity > 0.5 ? 'white' : 'inherit',
                              }}
                            >
                              {numValue.toFixed(1)}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  const handleExportPNG = async () => {
    if (!chartRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `chart-${type}-${Date.now()}.png`;
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!chartRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`chart-${type}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chart-${type}-${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {title && (
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {type} • {period}
          </p>
        </div>

        {/* Export Controls */}
        {showExport && (
          <div className="flex gap-2">
            <button
              onClick={handleExportPNG}
              disabled={exporting}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
              title="Export as PNG"
            >
              {exporting ? 'Exporting...' : 'PNG'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 disabled:opacity-50 transition-colors"
              title="Export as PDF"
            >
              {exporting ? 'Exporting...' : 'PDF'}
            </button>
            <button
              onClick={handleExportJSON}
              disabled={exporting}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
              title="Export as JSON"
            >
              {exporting ? 'Exporting...' : 'JSON'}
            </button>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div
        ref={chartRef}
        className="bg-slate-50 dark:bg-slate-900 rounded p-4"
        style={{ minHeight: type === ChartType.HeatMap ? 'auto' : height }}
      >
        {data && data.length > 0 ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Multi-Chart Dashboard
 * Displays multiple charts with different visualizations
 */
export interface MultiChartConfig {
  title: string;
  type: ChartType;
  period?: MetricsPeriod;
  height?: number;
  colors?: string[];
}

interface MultiChartDashboardProps {
  title?: string;
  charts: MultiChartConfig[];
  data: Record<string, ChartData[]>;
  onExport?: (chartId: string, data: any) => void;
}

export const MultiChartDashboard: React.FC<MultiChartDashboardProps> = ({
  title = 'Analytics Dashboard',
  charts,
  data,
  onExport,
}) => {
  return (
    <div className="space-y-8">
      {title && (
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {title}
        </h2>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {charts.map((chart, idx) => (
          <AnalyticsCharts
            key={idx}
            title={chart.title}
            type={chart.type}
            data={data[chart.title] || []}
            period={chart.period}
            height={chart.height || 300}
            colors={chart.colors}
            showExport={true}
            onExport={() => onExport?.(chart.title, data[chart.title])}
          />
        ))}
      </div>
    </div>
  );
};

export default AnalyticsCharts;

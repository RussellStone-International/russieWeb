import React from "react";
import { adaptLineSpec } from "./adaptLineSpec.js";
import {
    ResponsiveContainer,
    BarChart, Bar,
    LineChart, Line,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis,
    CartesianGrid, Tooltip, Legend,
} from "recharts";
import { format } from "date-fns";

const COLORS = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
];

const SHARED_TOOLTIP_STYLE = {
    backgroundColor: "rgba(10, 14, 26, 0.95)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    color: "#f3f4f6",
};

const CHART_WRAPPER_STYLE = {
    position: "relative",
    width: "100%",
    marginTop: "10px",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "20px",
    background: "#0a0e1a",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    overflow: "hidden",
};

// ─── Watermark ─────────────────────────────────────────────────────────────

function Watermark() {
    return (
        <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 0, opacity: 0.15, pointerEvents: "none",
        }}>
            <img
                src="https://raw.githubusercontent.com/MysticMelo/RSIChatbot/refs/heads/main/spinningLogo.png"
                alt=""
                style={{ width: "190px", height: "180px" }}
            />
        </div>
    );
}

// ─── Line ──────────────────────────────────────────────────────────────────

function LineChartInner({ spec, data }) {
    // Derive series keys + labels from whichever format n8n sent
    const seriesKeys = spec.yKeys ?? spec.series.map(s => s.name);
    const seriesLabels = spec.yLabels ?? seriesKeys;
    const xAxisLabel = spec.xAxis?.label ?? spec.xKey ?? "x";

    return (
        <LineChart data={data}>
            <XAxis
                dataKey="x"
                tickFormatter={(v) => {
                    if (spec.range !== "seasonal") return v;
                    if (!v || v === "<NA>") return "";
                    const d = v instanceof Date ? v : new Date(v);
                    return isNaN(d) ? "" : format(d, "MMM-yyyy");
                }}
            />
            <YAxis
                domain={["dataMin - 50", "dataMax + 50"]}
                tickFormatter={(v) => v?.toLocaleString()}
                orientation="right"
            />
            <Tooltip
                contentStyle={SHARED_TOOLTIP_STYLE}
                formatter={(value, name) => [value?.toLocaleString(), name]}
                labelFormatter={(label) => `${xAxisLabel}: ${label}`}
            />
            <Legend
                verticalAlign="top"
                align="center"
                iconType="line"
                wrapperStyle={{ marginBottom: 20 }}
            />
            {seriesKeys.map((key, idx) => (
                <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={seriesLabels[idx] || key}
                    stroke={COLORS[idx % COLORS.length]}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                />
            ))}
        </LineChart>
    );
}

// ─── Bar ───────────────────────────────────────────────────────────────────

function BarChartInner({ spec }) {
    const labels = spec.yLabels || spec.yKeys;
    return (
        <BarChart data={spec.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={spec.xKey} stroke="#9ca3af" style={{ fontSize: 12 }} />
            <YAxis
                stroke="#9ca3af"
                style={{ fontSize: 12 }}
                tickFormatter={(v) => v?.toLocaleString()}
            />
            <Tooltip
                contentStyle={SHARED_TOOLTIP_STYLE}
                formatter={(value) => value?.toLocaleString()}
            />
            <Legend wrapperStyle={{ color: "#f3f4f6", fontSize: 12 }} />
            {spec.yKeys.map((key, idx) => (
                <Bar
                    key={key}
                    dataKey={key}
                    name={labels[idx] || key}
                    fill={COLORS[idx % COLORS.length]}
                    isAnimationActive={false}
                />
            ))}
        </BarChart>
    );
}

// ─── Stacked Bar ───────────────────────────────────────────────────────────

function normaliseToPercent(data, yKeys) {
    return data.map((row) => {
        const total = yKeys.reduce((sum, k) => sum + (Number(row[k]) || 0), 0);
        const normalised = { ...row };
        yKeys.forEach((k) => {
            normalised[k] = total > 0 ? +((Number(row[k]) / total) * 100).toFixed(2) : 0;
        });
        return normalised;
    });
}

function StackedBarChartInner({ spec }) {
    const data = React.useMemo(
        () => (spec.percent ? normaliseToPercent(spec.data, spec.yKeys) : spec.data),
        [spec]
    );
    const labels = spec.yLabels || spec.yKeys;
    return (
        <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={spec.xKey} stroke="#9ca3af" style={{ fontSize: 12 }} />
            <YAxis
                stroke="#9ca3af"
                style={{ fontSize: 12 }}
                tickFormatter={(v) => (spec.percent ? `${v}%` : v?.toLocaleString())}
            />
            <Tooltip
                contentStyle={SHARED_TOOLTIP_STYLE}
                formatter={(value, name) => [
                    spec.percent ? `${value}%` : value?.toLocaleString(),
                    name,
                ]}
            />
            <Legend wrapperStyle={{ color: "#f3f4f6", fontSize: 12 }} />
            {spec.yKeys.map((key, idx) => (
                <Bar
                    key={key}
                    dataKey={key}
                    name={labels[idx] || key}
                    fill={COLORS[idx % COLORS.length]}
                    stackId="stack"
                    isAnimationActive={false}
                />
            ))}
        </BarChart>
    );
}

// ─── Radar ─────────────────────────────────────────────────────────────────

function RadarChartInner({ spec }) {
    const labels = spec.yLabels || spec.yKeys;
    return (
        <RadarChart data={spec.data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.15)" />
            <PolarAngleAxis dataKey={spec.xKey} stroke="#9ca3af" style={{ fontSize: 12 }} />
            {/*<PolarRadiusAxis stroke="#9ca3af" style={{ fontSize: 11 }} />*/}
            <Tooltip contentStyle={SHARED_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ color: "#f3f4f6", fontSize: 12 }} />
            {spec.yKeys.map((key, idx) => (
                <Radar
                    key={key}
                    name={labels[idx] || key}
                    dataKey={key}
                    stroke={COLORS[idx % COLORS.length]}
                    fill={COLORS[idx % COLORS.length]}
                    fillOpacity={0.25}
                    isAnimationActive={false}
                />
            ))}
        </RadarChart>
    );
}

// ─── Main Renderer ─────────────────────────────────────────────────────────

const MULTI_SERIES_TYPES = ["bar", "stackedBar", "radar"];

const ChartRenderer = React.memo(function ChartRenderer({ spec }) {
    const lineData = React.useMemo(
        () => (spec?.type === "line" ? adaptLineSpec(spec) : null),
        [spec]
    );

    if (!spec) return null;

    // Per-type validation
    if (spec.type === "line" && (!lineData || lineData.length === 0)) return null;
    if (
        MULTI_SERIES_TYPES.includes(spec.type) &&
        (!spec.data || !Array.isArray(spec.data) || spec.data.length === 0)
    ) return null;

    const renderInner = () => {
        switch (spec.type) {
            case "line":       return <LineChartInner spec={spec} data={lineData} />;
            case "bar":        return <BarChartInner spec={spec} />;
            case "stackedBar": return <StackedBarChartInner spec={spec} />;
            case "radar":      return <RadarChartInner spec={spec} />;
            default:
                console.warn(`ChartRenderer: unsupported type "${spec.type}"`);
                return null;
        }
    };

    const inner = renderInner();
    if (!inner) return null;

    return (
        <div className="chat-chart">
            <div className="chat-chart-title"><strong>{spec.title}</strong></div>
            <div className="chat-chart-wrapper" style={CHART_WRAPPER_STYLE}>
                <Watermark />
                <ResponsiveContainer width="100%" height="100%" debounce={50} style={{ position: "relative", zIndex: 1 }}>
                    {inner}
                </ResponsiveContainer>
            </div>
        </div>
    );
});

export default ChartRenderer;
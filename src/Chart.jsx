import React, { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

/*
========================================
CONFIG: n8n webhook URL
========================================
*/
const N8N_WEBHOOK_URL = "https://russie.app.n8n.cloud/webhook/2628b0f4-sdfasdflsadkfj3698-45ba-a098-21b54b5b8a7e";

/*
========================================
ADAPTER: canonical spec -> Recharts data
========================================
*/
function adaptLineSpec(spec) {
    return spec.xAxis.categories.map((x, i) => {
        const row = { x };

        spec.series.forEach(s => {
            row[s.name] = s.data[i] ?? null;
        });

        return row;
    });
}

/*
========================================
CHART RENDERER
========================================
*/
const ChartRenderer = React.memo(function ChartRenderer({ spec }) {
    if (!spec || spec.type !== "line") return null;

    const data = adaptLineSpec(spec);

    return (
        <div style={{ width: "100%", height: 320 }}>
            <h3 style={{ marginBottom: 10 }}>{spec.title}</h3>

            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data}>
                    <XAxis dataKey="x" />

                    <YAxis
                        domain={['dataMin - 50', 'dataMax + 50']}

                        tickFormatter={v => v?.toLocaleString()}
                    />

                    <Tooltip
                        formatter={(value, name) => [
                            value?.toLocaleString(),
                            name
                        ]}
                        labelFormatter={label =>
                            `${spec.xAxis.label}: ${label}`
                        }
                    />

                    <Legend />

                    {spec.series.map((s, idx) => (
                        <Line
                            key={s.name}
                            type="monotone"
                            dataKey={s.name}
                            dot={false}
                            strokeWidth={2}
                            stroke={[
                                "#1f77b4",
                                "#ff7f0e",
                                "#2ca02c",
                                "#d62728",
                                "#9467bd",
                                "#8c564b",
                                "#e377c2",
                                "#7f7f7f",
                                "#bcbd22",
                                "#17becf"
                            ][idx % 10]}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});


/*
========================================
APP WRAPPER (FETCH FROM n8n)
========================================
*/
export default function ChartTestApp() {
    const [chartSpec, setChartSpec] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchChart() {
            try {
                const res = await fetch(N8N_WEBHOOK_URL, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();
                console.log("data", data)

                // If n8n returns { chart: {...} } instead of raw spec,
                // adjust this line accordingly
                setChartSpec(data);
                console.log("chartspec", chartSpec)
            } catch (err) {
                console.error(err);
                setError("Failed to load chart");
            } finally {
                setLoading(false);
            }
        }

        fetchChart();
    }, []);

    if (loading) return <div>Loading chart…</div>;
    if (error) return <div>{error}</div>;

    return <ChartRenderer spec={chartSpec} />;
}

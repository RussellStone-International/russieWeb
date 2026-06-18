

// Handles two line spec formats from n8n:
// 1. Flat:      { data: [...], xKey, yKeys }
// 2. Canonical: { xAxis: { categories }, series: [] }
export function adaptLineSpec(spec) {
    if (Array.isArray(spec.data) && spec.xKey && Array.isArray(spec.yKeys)) {
        return spec.data.map(row => {
            const point = { x: row[spec.xKey] };
            spec.yKeys.forEach(k => { point[k] = row[k] ?? null; });
            return point;
        });
    }

    if (spec.xAxis?.categories && Array.isArray(spec.series)) {
        return spec.xAxis.categories.map((x, i) => {
            const row = { x };
            spec.series.forEach(s => { row[s.name] = s.data[i] ?? null; });
            return row;
        });
    }

    return null;
}
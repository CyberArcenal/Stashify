// components/TrafficChart.tsx
import React from 'react';

export interface TrafficChartProps {
    labels: string[];
    data: number[];
    height?: number;
}

const TrafficChart: React.FC<TrafficChartProps> = ({
    labels,
    data,
    height = 120
}) => {
    if (!data || data.length === 0 || !labels || labels.length === 0) {
        return (
            <div
                className="flex items-center justify-center rounded-lg"
                style={{
                    height: `${height}px`,
                    background: 'var(--card-secondary-bg)',
                    border: '1px solid var(--border-color)'
                }}
            >
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No traffic data available
                </p>
            </div>
        );
    }

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const valueRange = maxValue - minValue || 1;

    // Calculate points for the wave line with smooth curves
    const getWavePath = () => {
        const points = data.map((value, index) => {
            const x = (index / (data.length - 1)) * 100;
            // Fixed: Use the full height by mapping to 10-90 range (not 10-90 with bottom padding)
            const y = 90 - ((value - minValue) / valueRange) * 80; // 10 to 90 range
            return { x, y };
        });

        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return path;
    };

    const getAreaPath = () => {
        const wavePath = getWavePath();
        return `${wavePath} L 100 100 L 0 100 Z`;
    };

    // Format time labels for display
    const formatTimeLabel = (label: string) => {
        try {
            const date = new Date(label);
            return date.toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                hour12: false
            });
        } catch {
            return label;
        }
    };

    return (
        <div
            className="compact-stats relative overflow-hidden"
            style={{
                background: 'var(--card-secondary-bg)',
                border: '1px solid var(--border-color)',
                height: `${height}px`
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--sidebar-text)' }}>
                    Website Traffic (Last 7 Days)
                </h3>
                <div className="flex items-center gap-xs">
                    <div className="flex items-center gap-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: 'var(--accent-orange)' }}
                        ></div>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Visitors
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="relative" style={{ height: `calc(${height}px - 3rem)` }}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                >
                    {/* Gradient definitions */}
                    <defs>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity="0.4" />
                            <stop offset="80%" stopColor="var(--accent-orange)" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity="0.8" />
                            <stop offset="50%" stopColor="var(--accent-orange)" />
                            <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity="0.8" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines - fixed positions */}
                    {[25, 50, 75].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="100"
                            y2={y}
                            stroke="var(--border-light)"
                            strokeWidth="0.5"
                            strokeOpacity="0.3"
                        />
                    ))}

                    {/* Area fill */}
                    <path
                        d={getAreaPath()}
                        fill="url(#areaGradient)"
                        stroke="none"
                    />

                    {/* Wave line */}
                    <path
                        d={getWavePath()}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Data points - show all points but make them visible on hover */}
                    {data.map((value, index) => {
                        const x = (index / (data.length - 1)) * 100;
                        const y = 90 - ((value - minValue) / valueRange) * 80;

                        return (
                            <g key={index}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="2.5"
                                    fill="var(--accent-orange)"
                                    className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                />
                                <title>
                                    {formatTimeLabel(labels[index])}: {value} visitors
                                </title>
                            </g>
                        );
                    })}
                </svg>

                {/* Current value indicator */}
                <div
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium"
                    style={{
                        background: 'var(--accent-orange)',
                        color: 'var(--sidebar-text)'
                    }}
                >
                    {data[data.length - 1]} visitors
                </div>

                {/* Min-Max indicators */}
                <div className="absolute bottom-2 left-2 flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>Min: {minValue}</span>
                    <span>Max: {maxValue}</span>
                </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 px-1">
                {labels.length > 0 && [
                    labels[0],
                    labels[Math.floor(labels.length / 2)],
                    labels[labels.length - 1]
                ].map((label, index) => (
                    <div
                        key={index}
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {formatTimeLabel(label)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TrafficChart;
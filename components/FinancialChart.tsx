
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FinancialRecord } from '../types';

interface FinancialChartProps {
  data: FinancialRecord[];
}

const FinancialChart: React.FC<FinancialChartProps> = ({ data }) => {
  if (data.length === 0) {
    return <div className="text-center p-4 text-slate-400">아직 재정 데이터가 없습니다.</div>;
  }

  const formatTooltipLabel = (label: string, payload: any) => { // label is now string like "1980-01"
    if (payload && payload.length > 0) {
      const record = payload[0].payload;
      return `${record.year}년 ${record.month}월`;
    }
    // Attempt to parse label if needed, though record.year/month is more robust
    const parts = label.split('-');
    if (parts.length === 2) {
        return `${parts[0]}년 ${parseInt(parts[1], 10)}월`;
    }
    return `시간: ${label}`;
  };
  
  const formatYAxisTick = (tick: number) => {
    if (tick >= 1000000) return `${(tick / 1000000).toFixed(1)}M`;
    if (tick >= 1000) return `${(tick / 1000).toFixed(0)}K`;
    return tick.toString();
  };


  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg h-72 md:h-96">
      <h3 className="text-xl font-semibold text-sky-400 mb-4">재정 내역</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis 
            dataKey={(record) => `${record.year}-${String(record.month).padStart(2,'0')}`} 
            stroke="#94a3b8" 
            tick={{ fontSize: 12 }}
            label={{ value: "시간 (년-월)", position: 'insideBottom', offset: -15, fill: '#94a3b8' }}
          />
          <YAxis 
            stroke="#94a3b8" 
            tick={{ fontSize: 12 }}
            tickFormatter={formatYAxisTick}
            label={{ value: "자금 ($)", angle: -90, position: 'insideLeft', fill: '#94a3b8', offset: -5 }}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, "자금"]}
            labelFormatter={formatTooltipLabel}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#cbd5e1', fontWeight: 'bold' }}
            itemStyle={{ color: '#67e8f9' }}
          />
          <Legend wrapperStyle={{ color: '#e2e8f0', paddingTop: '10px' }} />
          <Line type="monotone" dataKey="funds" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: '#0ea5e9' }} activeDot={{ r: 6 }} name="회사 자금" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinancialChart;
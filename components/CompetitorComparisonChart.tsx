import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export interface ComparisonData {
  name: string;
  funds: number;
  reputation: number;
  releasedGamesCount: number;
  averageScoreScaled: number; // Average score * 10 (0-100)
  isPlayer: boolean;
}

interface CompetitorComparisonChartProps {
  data: ComparisonData[];
}

const METRIC_COLORS = {
  funds: '#38bdf8', // sky-500
  reputation: '#4ade80', // green-400
  games: '#fbbf24', // amber-400
  score: '#a78bfa', // violet-400
};

const CHART_HEIGHT = '500px'; // Adjusted height for better display of angled labels

interface TransformedChartData extends ComparisonData {
  normalizedFunds: number;
  normalizedReputation: number;
  normalizedGamesCount: number;
  normalizedAverageScore: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const companyData = payload[0].payload as TransformedChartData; // Original data for the company
    return (
      <div className="bg-slate-800 p-3 rounded shadow-lg border border-slate-700 text-sm">
        <p className="text-sky-400 font-semibold mb-1">{`${companyData.name}`}</p>
        {payload.map((entry: any) => {
          let originalValueDisplay = "";
          let entryNameKorean = "";

          switch (entry.dataKey) {
            case 'normalizedFunds':
              originalValueDisplay = `$${companyData.funds.toLocaleString()}`;
              entryNameKorean = "자금";
              break;
            case 'normalizedReputation':
              originalValueDisplay = `${companyData.reputation}/100`;
              entryNameKorean = "명성";
              break;
            case 'normalizedGamesCount':
              originalValueDisplay = `${companyData.releasedGamesCount}개`;
              entryNameKorean = "출시 수";
              break;
            case 'normalizedAverageScore':
              originalValueDisplay = `${(companyData.averageScoreScaled / 10).toFixed(1)}/10`;
              entryNameKorean = "평균 점수";
              break;
          }
          return (
            <p key={entry.dataKey} style={{ color: entry.color }}>
              {`${entryNameKorean}: ${originalValueDisplay}`}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};


const CompetitorComparisonChart: React.FC<CompetitorComparisonChartProps> = ({ data }) => {
  if (data.length === 0) {
    return <div className="text-center p-4 text-slate-400">경쟁사 비교 데이터가 없습니다.</div>;
  }

  // Normalization
  const positiveFunds = data.filter(d => d.funds > 0).map(d => d.funds);
  const maxPositiveFund = positiveFunds.length > 0 ? Math.max(...positiveFunds) : 1; // Avoid division by zero if no positive funds

  const maxReputation = 100; // Reputation is 0-100
  
  const gamesCounts = data.map(d => d.releasedGamesCount);
  const maxGamesCount = gamesCounts.length > 0 ? Math.max(...gamesCounts) : 1; // Avoid division by zero

  const maxAvgScore = 100; // averageScoreScaled is 0-100

  const transformedData: TransformedChartData[] = data.map(d => ({
    ...d,
    normalizedFunds: maxPositiveFund === 0 ? 0 : Math.max(0, Math.min(100,(d.funds / maxPositiveFund) * 100)),
    normalizedReputation: (d.reputation / maxReputation) * 100,
    normalizedGamesCount: maxGamesCount === 0 ? 0 : (d.releasedGamesCount / maxGamesCount) * 100,
    normalizedAverageScore: d.averageScoreScaled, // Already 0-100
  }));
  
  const yAxisTickFormatter = (value: number) => `${value}`;

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-sky-400 mb-6 text-center">경쟁사 비교 (정규화)</h3>
      <div style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={transformedData} 
            margin={{ top: 20, right: 20, left: 0, bottom: 85 }} // Increased bottom margin for angled labels
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              interval={0} 
              tick={{ fontSize: 10, fill: '#cbd5e1' }} 
              height={70} // Allocate space for labels
              label={{ value: '회사명', position: 'insideBottom', offset: -70, fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={yAxisTickFormatter}
              label={{ value: '정규화된 값 (0-100)', angle: -90, position: 'insideLeft', fill: '#94a3b8', offset:10, fontSize: 12 }}
              tick={{ fontSize: 10, fill: '#cbd5e1' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(71, 85, 105, 0.3)' }}/>
            <Legend wrapperStyle={{ paddingTop: '15px', color: '#e2e8f0' }} />
            <Bar dataKey="normalizedFunds" name="자금" fill={METRIC_COLORS.funds} radius={[3, 3, 0, 0]} barSize={15} />
            <Bar dataKey="normalizedReputation" name="명성" fill={METRIC_COLORS.reputation} radius={[3, 3, 0, 0]} barSize={15}/>
            <Bar dataKey="normalizedGamesCount" name="출시 수" fill={METRIC_COLORS.games} radius={[3, 3, 0, 0]} barSize={15}/>
            <Bar dataKey="normalizedAverageScore" name="평균 점수" fill={METRIC_COLORS.score} radius={[3, 3, 0, 0]} barSize={15}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CompetitorComparisonChart;
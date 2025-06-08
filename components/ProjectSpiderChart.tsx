
import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { GameProject } from '../types';

interface ProjectSpiderChartProps {
  points: GameProject['points'];
}

const ProjectSpiderChart: React.FC<ProjectSpiderChartProps> = ({ points }) => {
  const chartData = [
    { subject: '재미', value: Math.max(0, points.fun) },
    { subject: '그래픽', value: Math.max(0, points.graphics) },
    { subject: '사운드', value: Math.max(0, points.sound) },
    { subject: '창의성', value: Math.max(0, points.creativity) },
    { subject: '버그', value: Math.max(0, points.bugs) },
  ];

  const allValues = chartData.map(d => d.value);
  const maxValueInChart = Math.max(...allValues);
  // Ensure a minimum scale of 50 for the radius axis. If actual max is higher, use that.
  // Add a 10% buffer to the max value for better visual representation.
  const radiusDomainMax = Math.max(maxValueInChart, 50);
  const finalRadiusDomainMax = radiusDomainMax + Math.ceil(radiusDomainMax * 0.1);


  return (
    <div className="h-64 md:h-72 w-full mt-4" aria-label="게임 능력치 스파이더 차트">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius="80%" 
            data={chartData}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }} // Add some margin to prevent clipping
        >
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, finalRadiusDomainMax]} 
            stroke="#475569" 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
          />
          <Radar 
            name="현재 능력치" 
            dataKey="value" 
            stroke="#38bdf8" 
            fill="#38bdf8" 
            fillOpacity={0.7}
            animationDuration={300}
          />
          <Tooltip
            contentStyle={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.9)', // bg-slate-800 with opacity
                border: '1px solid #334155', // border-slate-700
                borderRadius: '0.5rem' 
            }}
            labelStyle={{ display: 'none' }} // Subject name is part of the formatted value
            formatter={(value: number | string | Array<string | number>, name: string, props: any) => {
                // value from dataKey, props.payload contains the full data object for the point
                return [`${props.payload.subject}: ${Number(value).toFixed(0)}`, null];
            }}
            itemStyle={{ color: '#67e8f9' }} // text-sky-300
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProjectSpiderChart;


import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { StaffSkills } from '../types';
import { SKILL_KOREAN_NAMES } from '../constants';

interface StaffSkillsSpiderChartProps {
  skills: StaffSkills;
}

const StaffSkillsSpiderChart: React.FC<StaffSkillsSpiderChartProps> = ({ skills }) => {
  const chartData = (Object.keys(skills) as Array<keyof StaffSkills>).map(key => ({
    subject: SKILL_KOREAN_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1),
    value: Math.max(0, skills[key]),
    // fullMark: 25, // Example fullMark, adjust as needed or make dynamic
  }));

  const allValues = chartData.map(d => d.value);
  const maxValueInChart = Math.max(...allValues, 0); // Ensure it's at least 0
  // Set a base minimum for the chart scale, e.g., 10 or 15, so low skills are still visible.
  const radiusDomainBase = Math.max(maxValueInChart, 15); 
  // Add a small buffer to the max value for better visual representation.
  const finalRadiusDomainMax = radiusDomainBase + Math.ceil(radiusDomainBase * 0.1);

  return (
    <div className="h-60 md:h-64 w-full mt-2" aria-label="직원 능력치 스파이더 차트">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius="80%" 
            data={chartData}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, finalRadiusDomainMax]} 
            stroke="#475569" 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickCount={6} // Adjust for better readability
          />
          <Radar 
            name="능력치" 
            dataKey="value" 
            stroke="#8884d8" // A common color for categorical data
            fill="#8884d8" 
            fillOpacity={0.65}
            animationDuration={300}
          />
          <Tooltip
            contentStyle={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                border: '1px solid #334155', 
                borderRadius: '0.5rem' 
            }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number | string | Array<string | number>, name: string, props: any) => {
                return [`${props.payload.subject}: ${Number(value).toFixed(0)}`, null];
            }}
            itemStyle={{ color: '#a3a0f0' }} // Slightly lighter version of stroke for item text
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StaffSkillsSpiderChart;

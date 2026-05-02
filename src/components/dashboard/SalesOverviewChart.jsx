import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, ChartTooltip, ChartLegend, ChartDataLabels);

export default function SalesOverviewChart({ salesByCategory, topProducts, salesTrendData = [] }) {
  const trendData = salesTrendData.length > 0 ? salesTrendData : [
    { name: 'Week 1', sales: 0, Revenue: 0, Profit: 0 },
    { name: 'Week 2', sales: 0, Revenue: 0, Profit: 0 }
  ];

  const pieChartData = topProducts.length > 0 
    ? topProducts.slice(0, 6).map(product => ({
        name: product.name,
        value: Number(product.units ?? product.quantity ?? product.sold ?? 0)
      }))
    : [];

  return (
    <div className="w-full bg-white rounded-[15px] sm:rounded-[20px] p-3 sm:p-4 md:p-5 pb-4 shadow-[inset_0_4px_4px_rgba(0,0,0,0.1),0_4px_4px_rgba(0,0,0,0.25)] transition-all duration-300 flex flex-col h-full">
      <h2 className="mb-3 sm:mb-4 font-bold text-[#270a4e] text-lg sm:text-xl md:text-2xl lg:text-3xl hover:text-[#3a1a6b] transition-colors duration-200">
        Sales Overview
      </h2>

      <div className="h-[120px] sm:h-[140px] md:h-[160px] overflow-hidden">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#270a4e] mb-2 sm:mb-3">Top Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 text-sm sm:text-base">
          {topProducts.length > 0 ? topProducts.slice(0, 4).map((product, index) => (
            <div key={index} className="font-bold text-[#270a4e] hover:text-[#4F46E5] transition-colors duration-300">
              <div className="flex items-center gap-1">
                <span className="truncate">- {product.name}</span>
                <span className="text-xs sm:text-sm font-normal whitespace-nowrap">{(Number(product.units ?? product.quantity ?? product.sold ?? 0)).toLocaleString()} Sold</span>
              </div>
              <div className="text-xs sm:text-sm font-normal text-gray-500">{product.category}</div>
            </div>
          )) : (
            <div className="text-sm sm:text-base text-gray-500">No sales data available</div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4">
        <div className="w-full lg:w-1/2 flex items-center justify-center relative h-[240px] sm:h-[260px] md:h-[280px] lg:h-[300px]">
          {pieChartData.length > 0 ? (
            <Doughnut
              data={{
                labels: pieChartData.map(item => item.name),
                datasets: [{
                  data: pieChartData.map(item => item.value),
                  backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(251, 146, 60, 0.8)', 'rgba(250, 204, 21, 0.8)', 'rgba(74, 222, 128, 0.8)', 'rgba(96, 165, 250, 0.8)', 'rgba(168, 85, 247, 0.8)'],
                  borderColor: ['rgba(239, 68, 68, 1)', 'rgba(251, 146, 60, 1)', 'rgba(250, 204, 21, 1)', 'rgba(74, 222, 128, 1)', 'rgba(96, 165, 250, 1)', 'rgba(168, 85, 247, 1)']
                }]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { font: { family: 'sintony', size: window.innerWidth < 640 ? 10 : 13 } } },
                  datalabels: { color: '#fff', font: { weight: 'bold', size: window.innerWidth < 640 ? 10 : 12 }, formatter: (value, ctx) => {
                    const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                    return (value * 100 / sum).toFixed(0) + '%';
                  }}
                }
              }}
            />
          ) : <div className="text-gray-500 text-xs sm:text-sm">No sales data available</div>}
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center h-[240px] sm:h-[260px] md:h-[280px] lg:h-[300px]">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#270a4e" style={{ fontSize: window.innerWidth < 640 ? '10px' : '14px' }} />
                <YAxis stroke="#270a4e" style={{ fontSize: window.innerWidth < 640 ? '10px' : '14px' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Revenue" stroke="#C9A8E6" strokeWidth={window.innerWidth < 640 ? 2 : 3} />
                <Line type="monotone" dataKey="Profit" stroke="#841c4f" strokeWidth={window.innerWidth < 640 ? 2 : 3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="text-gray-500 text-xs sm:text-sm">No trend data available</div>}
        </div>
      </div>
    </div>
  );
}
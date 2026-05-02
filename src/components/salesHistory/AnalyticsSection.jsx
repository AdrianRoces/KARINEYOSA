import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from './constants';

export default function AnalyticsSection({
  platformSummary,
  categorySummary,
  dailySales,
  viewPeriod
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-[#841c4f] mb-4 font-['Satoshi']">Sales Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Distribution Chart */}
        <div className="bg-[#f9eef5] p-6 rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)]">
          <h3 className="text-lg font-medium text-[#841c4f] mb-3 font-['Satoshi']">Sales by Platform</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformSummary}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {platformSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Category Distribution Chart */}
        <div className="bg-[#f9eef5] p-6 rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)]">
          <h3 className="text-lg font-medium text-[#841c4f] mb-3 font-['Satoshi']">Sales by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorySummary}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {categorySummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Daily Sales Trend */}
        {viewPeriod !== 'day' && (
          <div className="bg-[#f9eef5] p-6 rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)] lg:col-span-2">
            <h3 className="text-lg font-medium text-[#841c4f] mb-3 font-['Satoshi']">Daily Sales Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySales}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="amount" name="Sales Amount" fill="#65366F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

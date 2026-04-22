"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock sprint data
const mockSprint = {
  id: 'sprint-1',
  name: 'Sprint 1: Core Features',
  startDate: '2026-04-20',
  endDate: '2026-05-04',
  totalPoints: 42,
};

// Mock burndown data
const mockBurndownData = [
  { day: 'Day 1', ideal: 42, actual: 42 },
  { day: 'Day 2', ideal: 38, actual: 40 },
  { day: 'Day 3', ideal: 34, actual: 35 },
  { day: 'Day 4', ideal: 30, actual: 32 },
  { day: 'Day 5', ideal: 26, actual: 28 },
  { day: 'Day 6', ideal: 22, actual: 25 },
  { day: 'Day 7', ideal: 18, actual: 20 },
  { day: 'Day 8', ideal: 14, actual: 15 },
  { day: 'Day 9', ideal: 10, actual: 12 },
  { day: 'Day 10', ideal: 6, actual: 8 },
  { day: 'Day 11', ideal: 3, actual: 5 },
  { day: 'Day 12', ideal: 0, actual: 0 },
];

export default function BurndownChartPage({ params }: { params: { id: string; sprintId: string } }) {
  const isBehind = mockBurndownData[mockBurndownData.length - 1].actual > mockBurndownData[mockBurndownData.length - 1].ideal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Burndown Chart</h1>
        <p className="text-gray-600 mt-1">{mockSprint.name}</p>
      </div>

      {/* Status Card */}
      <Card className={`border-2 shadow-sm ${isBehind ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {isBehind ? 'Behind Schedule' : 'On Track'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isBehind 
                  ? `${mockBurndownData[mockBurndownData.length - 1].actual - mockBurndownData[mockBurndownData.length - 1].ideal} points behind ideal line`
                  : 'Progressing according to plan'
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {mockBurndownData[mockBurndownData.length - 1].actual}
              </p>
              <p className="text-sm text-gray-600">points remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Burndown Chart */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Sprint Burndown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockBurndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="day" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="ideal" 
                  stroke="#9ca3af" 
                  strokeDasharray="5 5"
                  name="Ideal Line"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#2563eb" 
                  name="Actual"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Daily Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Day</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ideal</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actual</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Variance</th>
                </tr>
              </thead>
              <tbody>
                {mockBurndownData.map((row, index) => {
                  const variance = row.actual - row.ideal;
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{row.day}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-right">{row.ideal}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium text-right">{row.actual}</td>
                      <td className={`py-3 px-4 text-sm font-medium text-right ${
                        variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {variance > 0 ? '+' : ''}{variance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockSprint.totalPoints}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Points Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockSprint.totalPoints - mockBurndownData[mockBurndownData.length - 1].actual}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(((mockSprint.totalPoints - mockBurndownData[mockBurndownData.length - 1].actual) / mockSprint.totalPoints) * 100)}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

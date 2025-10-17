import { BarChart2, TrendingUp, AlertTriangle } from "lucide-react";

export default function ReportsAnalytics() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <BarChart2 className="text-blue-500" />
        Reports & Analytics
      </h1>

      {/* Summary Cards (Placeholder) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-500" />
            <h2 className="font-semibold text-gray-700">Average Score</h2>
          </div>
          <div className="h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
            82%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-yellow-500" />
            <h2 className="font-semibold text-gray-700">Low-performing Items</h2>
          </div>
          <div className="h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
            Q2, Q5
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-blue-500" />
            <h2 className="font-semibold text-gray-700">Top Item</h2>
          </div>
          <div className="h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
            Question 3
          </div>
        </div>
      </div>

      {/* Placeholder Chart Area */}
      <div className="bg-white rounded-2xl p-6 shadow-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">
          Item Analysis Overview
        </h2>
        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
          [ Bar Chart Placeholder ]
        </div>
      </div>
    </div>
  );
}

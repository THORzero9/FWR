import { useQuery } from "@tanstack/react-query";
import { useStats } from "@/hooks/use-stats";
import StatCard from "@/components/stats/stat-card";
import WasteChart from "@/components/stats/waste-chart";

export default function Stats() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-neutral-500">Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <h2 className="text-xl font-medium mb-5">Your Impact</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard 
          title="CO2 Saved"
          value={`${stats?.co2Saved || 0}kg`}
          change="+2.4kg this month"
          icon="eco"
          iconColor="text-primary"
          changeColor="text-primary"
        />
        <StatCard 
          title="Water Saved"
          value={`${stats?.waterSaved || 0}L`}
          change="+65L this month"
          icon="water_drop"
          iconColor="text-blue-500"
          changeColor="text-blue-500"
        />
        <StatCard 
          title="Money Saved"
          value={`$${stats?.moneySaved || 0}`}
          change="+$32 this month"
          icon="paid"
          iconColor="text-amber-500"
          changeColor="text-amber-500"
        />
        <StatCard 
          title="Waste Reduced"
          value={`${stats?.wasteReduced || 0}kg`}
          change="+1.8kg this month"
          icon="delete"
          iconColor="text-red-500"
          changeColor="text-red-500"
        />
      </div>

      {/* Monthly Progress Chart */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-medium mb-4">Monthly Progress</h3>
        <WasteChart data={stats?.monthlyProgress || []} />
      </div>

      {/* Food Waste Breakdown */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-medium mb-4">Waste Breakdown</h3>
        <div className="flex justify-center mb-4">
          {/* SVG Pie Chart */}
          <svg className="w-40 h-40" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#4CAF50"
              strokeWidth="20"
              strokeDasharray="251.2"
              strokeDashoffset="0"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#FFC107"
              strokeWidth="20"
              strokeDasharray="251.2"
              strokeDashoffset="150.72" // 251.2 * 0.4 (100% - 60%)
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#2196F3"
              strokeWidth="20"
              strokeDasharray="251.2"
              strokeDashoffset="175.84" // 251.2 * 0.7 (100% - 60% - 30%)
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#F44336"
              strokeWidth="20"
              strokeDasharray="251.2"
              strokeDashoffset="226.08" // 251.2 * 0.9 (100% - 60% - 30% - 10%)
            />
          </svg>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {stats?.wasteBreakdown.map((item, index) => (
            <div key={index} className="flex items-center">
              <div 
                className={`w-3 h-3 rounded-sm mr-2 ${
                  index === 0 ? 'bg-primary' :
                  index === 1 ? 'bg-amber-500' :
                  index === 2 ? 'bg-blue-500' :
                  'bg-red-500'
                }`}
              ></div>
              <span className="text-xs">{item.category} ({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

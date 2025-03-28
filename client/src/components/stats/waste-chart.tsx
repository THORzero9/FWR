interface ChartDataPoint {
  month: string;
  amount: number;
}

interface WasteChartProps {
  data: ChartDataPoint[];
}

export default function WasteChart({ data }: WasteChartProps) {
  // Find the maximum value to scale the chart
  const maxValue = Math.max(...data.map(d => d.amount));
  
  return (
    <div className="h-52 flex items-end space-x-1 relative">
      {/* X and Y axis */}
      <div className="absolute left-0 bottom-0 h-full w-full border-l border-b border-neutral-200 flex flex-col justify-between pb-6">
        <div className="w-full border-t border-dashed border-neutral-200 h-0"></div>
        <div className="w-full border-t border-dashed border-neutral-200 h-0"></div>
        <div className="w-full border-t border-dashed border-neutral-200 h-0"></div>
        <div className="w-full border-t border-dashed border-neutral-200 h-0"></div>
      </div>
      
      {/* Bars */}
      {data.map((item, index) => {
        const heightPercentage = (item.amount / maxValue) * 100;
        
        return (
          <div 
            key={index}
            className="h-[calc(100%-1.5rem)] flex-1 flex items-end justify-center"
          >
            <div 
              className="w-8 bg-primary relative z-10"
              style={{ height: `${heightPercentage}%` }}
            >
              <div className="absolute -bottom-6 left-0 w-full text-center text-xs text-neutral-500">
                {item.month}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

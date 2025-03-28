interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: string;
  iconColor?: string;
  changeColor?: string;
}

export default function StatCard({ 
  title, 
  value, 
  change,
  icon,
  iconColor = "text-primary",
  changeColor = "text-primary"
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center mb-2">
        <span className={`material-icons ${iconColor} mr-2`}>{icon}</span>
        <p className="text-sm text-neutral-500">{title}</p>
      </div>
      <p className="text-2xl font-medium">{value}</p>
      <p className={`text-xs ${changeColor} mt-1`}>{change}</p>
    </div>
  );
}

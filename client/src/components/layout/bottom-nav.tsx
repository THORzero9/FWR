import { useLocation, Link } from "wouter";

type NavItem = {
  path: string;
  icon: string;
  label: string;
};

const navItems: NavItem[] = [
  { path: "/", icon: "inventory_2", label: "Inventory" },
  { path: "/stats", icon: "insights", label: "Stats" },
  { path: "/recipes", icon: "restaurant", label: "Recipes" },
  { path: "/share", icon: "share", label: "Share" }
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 w-full bg-white shadow-lg z-10 max-w-lg mx-auto">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <a
              className={`flex flex-col items-center justify-center w-full h-full ${
                location === item.path ? "text-primary" : "text-neutral-500"
              }`}
            >
              <span className="material-icons">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </nav>
  );
}

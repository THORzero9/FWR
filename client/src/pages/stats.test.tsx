import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StatsPage from './stats'; // Adjust path as needed
import { FoodWasteStats } from '@shared/schema';

// Mock hooks
const mockUseStats = vi.fn();
vi.mock('@/hooks/use-stats', () => ({
  useStats: () => mockUseStats(),
}));

// Mock child components
vi.mock('@/components/stats/stat-card', () => ({
  default: ({ title, value, change, icon }: { title: string, value: string, change: string, icon: string }) => (
    <div data-testid={`stat-card-${icon}`}>
      <h3>{title}</h3>
      <p>{value}</p>
      <span>{change}</span>
    </div>
  ),
}));
vi.mock('@/components/stats/waste-chart', () => ({
  default: ({ data }: { data: any[] }) => <div data-testid="waste-chart">WasteChart Mock ({data.length} data points)</div>,
}));

// Helper to provide QueryClient
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Sample Data
const sampleStatsData: FoodWasteStats = {
  co2Saved: 125.5,
  waterSaved: 2300,
  moneySaved: 78.9,
  wasteReduced: 15.3,
  monthlyProgress: [
    { month: "Jan", amount: 8.2 },
    { month: "Feb", amount: 7.1 },
  ],
  wasteBreakdown: [
    { category: "Fruits", percentage: 28 },
    { category: "Vegetables", percentage: 35 },
    { category: "Dairy", percentage: 15 },
  ],
};

describe('StatsPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for useStats
    mockUseStats.mockReturnValue({ 
      data: undefined, 
      isLoading: false, 
      error: null 
    });
  });

  it('renders loading state', () => {
    mockUseStats.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<StatsPage />, { wrapper: AllTheProviders });
    expect(screen.getByText(/Loading stats.../i)).toBeInTheDocument();
  });

  it('renders main sections: Your Impact, Monthly Progress, Waste Breakdown', () => {
    mockUseStats.mockReturnValue({ data: sampleStatsData, isLoading: false });
    render(<StatsPage />, { wrapper: AllTheProviders });
    expect(screen.getByRole('heading', { name: /Your Impact/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Monthly Progress/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Waste Breakdown/i, level: 3 })).toBeInTheDocument();
  });

  describe('With Stats Data', () => {
    beforeEach(() => {
      mockUseStats.mockReturnValue({
        data: sampleStatsData,
        isLoading: false,
      });
    });

    it('renders StatCard components with correct data', () => {
      render(<StatsPage />, { wrapper: AllTheProviders });
      
      const co2Card = screen.getByTestId('stat-card-eco');
      expect(within(co2Card).getByText('CO2 Saved')).toBeInTheDocument();
      expect(within(co2Card).getByText(`${sampleStatsData.co2Saved}kg`)).toBeInTheDocument();

      const waterCard = screen.getByTestId('stat-card-water_drop');
      expect(within(waterCard).getByText('Water Saved')).toBeInTheDocument();
      expect(within(waterCard).getByText(`${sampleStatsData.waterSaved}L`)).toBeInTheDocument();
      
      const moneyCard = screen.getByTestId('stat-card-paid');
      expect(within(moneyCard).getByText('Money Saved')).toBeInTheDocument();
      expect(within(moneyCard).getByText(`$${sampleStatsData.moneySaved}`)).toBeInTheDocument();

      const wasteCard = screen.getByTestId('stat-card-delete');
      expect(within(wasteCard).getByText('Waste Reduced')).toBeInTheDocument();
      expect(within(wasteCard).getByText(`${sampleStatsData.wasteReduced}kg`)).toBeInTheDocument();
    });

    it('renders WasteChart with monthly progress data', () => {
      render(<StatsPage />, { wrapper: AllTheProviders });
      const chart = screen.getByTestId('waste-chart');
      expect(chart).toHaveTextContent(`WasteChart Mock (${sampleStatsData.monthlyProgress.length} data points)`);
    });
    
    it('renders WasteChart with empty array if no monthly progress data', () => {
      mockUseStats.mockReturnValue({
        data: { ...sampleStatsData, monthlyProgress: [] },
        isLoading: false,
      });
      render(<StatsPage />, { wrapper: AllTheProviders });
      const chart = screen.getByTestId('waste-chart');
      expect(chart).toHaveTextContent(`WasteChart Mock (0 data points)`);
    });

    it('renders waste breakdown legend with correct categories and percentages', () => {
      render(<StatsPage />, { wrapper: AllTheProviders });
      const breakdownSection = screen.getByText('Waste Breakdown').closest('div');
      expect(breakdownSection).toBeDefined();

      sampleStatsData.wasteBreakdown.forEach(item => {
        expect(within(breakdownSection!).getByText(`${item.category} (${item.percentage}%)`)).toBeInTheDocument();
      });
    });
    
    it('renders placeholder SVG pie chart', () => {
      render(<StatsPage />, { wrapper: AllTheProviders });
      const breakdownSection = screen.getByText('Waste Breakdown').closest('div');
      expect(within(breakdownSection!).getByRole('graphics-document')).toBeInTheDocument(); // SVG role
    });
  });
  
  it('renders gracefully if stats data is null or partially missing', () => {
    mockUseStats.mockReturnValue({ data: null, isLoading: false });
    render(<StatsPage />, { wrapper: AllTheProviders });

    // Check that default values (e.g., 0) are shown in StatCards
    const co2Card = screen.getByTestId('stat-card-eco');
    expect(within(co2Card).getByText('0kg')).toBeInTheDocument();
    
    const chart = screen.getByTestId('waste-chart');
    expect(chart).toHaveTextContent(`WasteChart Mock (0 data points)`); // Handles empty monthlyProgress

    const breakdownSection = screen.getByText('Waste Breakdown').closest('div');
    expect(within(breakdownSection!).queryAllByText(/\(%/).length).toBe(0); // No legend items if breakdown is missing/empty
  });
});

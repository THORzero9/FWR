import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BottomNav from './bottom-nav'; // Adjust path as needed
import { MemoryRouter } from 'wouter'; // To provide context for Link if not fully mocked

// Mock wouter's useLocation and Link
// We can mock useLocation to control the active path.
// Link can be mocked to check its props, or we can use MemoryRouter and check rendered <a> tags.
// For simplicity in checking active styles, controlling useLocation is key.

const mockUseLocation = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
    // Link: ({ href, children }: { href: string, children: React.ReactNode }) => <a href={href}>{children}</a>, // Basic mock for Link
  };
});

const navItemsConfig = [
  { path: "/", icon: "inventory_2", label: "Inventory" },
  { path: "/stats", icon: "insights", label: "Stats" },
  { path: "/recipes", icon: "restaurant", label: "Recipes" },
  { path: "/share", icon: "share", label: "Share" }
];

// Wrapper to provide MemoryRouter for Link components
const RouterWrapper = ({ children, initialEntries = ['/'] }: { children: React.ReactNode, initialEntries?: string[] }) => {
  return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
};


describe('BottomNav Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders all navigation items with correct labels, icons, and links', () => {
    mockUseLocation.mockReturnValue(["/"]); // Set current location
    render(<BottomNav />, { wrapper: RouterWrapper });

    navItemsConfig.forEach(item => {
      const linkElement = screen.getByRole('link', { name: new RegExp(item.label, 'i') });
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', item.path);
      
      // Check for icon and label within the link structure
      // The structure is Link -> div -> (span.material-icons, span.text-xs)
      const iconElement = linkElement.querySelector('.material-icons');
      const labelElement = linkElement.querySelector('.text-xs');
      
      expect(iconElement).toHaveTextContent(item.icon);
      expect(labelElement).toHaveTextContent(item.label);
    });
  });

  it('applies active styling to the current location"s nav item', () => {
    const activePath = "/recipes";
    mockUseLocation.mockReturnValue([activePath]);
    render(<BottomNav />, { wrapper: RouterWrapper });

    navItemsConfig.forEach(item => {
      const linkElement = screen.getByRole('link', { name: item.label });
      // The parent div of spans gets the active class "text-primary"
      const styleableContainer = linkElement.firstChild; // The div inside Link

      if (item.path === activePath) {
        expect(styleableContainer).toHaveClass('text-primary');
      } else {
        expect(styleableContainer).toHaveClass('text-neutral-500');
      }
    });
  });
  
  it('applies inactive styling when location does not match', () => {
    mockUseLocation.mockReturnValue(["/non-existent-path"]); // A path not in navItems
    render(<BottomNav />, { wrapper: RouterWrapper });

    navItemsConfig.forEach(item => {
      const linkElement = screen.getByRole('link', { name: item.label });
      const styleableContainer = linkElement.firstChild;
      expect(styleableContainer).toHaveClass('text-neutral-500');
      expect(styleableContainer).not.toHaveClass('text-primary');
    });
  });
  
  it('changes active style when location changes', () => {
    // Initial location: /
    mockUseLocation.mockReturnValue(['/']);
    const { rerender } = render(<BottomNav />, { wrapper: RouterWrapper });
    expect(screen.getByRole('link', { name: 'Inventory' }).firstChild).toHaveClass('text-primary');
    expect(screen.getByRole('link', { name: 'Stats' }).firstChild).toHaveClass('text-neutral-500');

    // Change location to /stats
    mockUseLocation.mockReturnValue(['/stats']);
    rerender(<BottomNav />); // Rerender with new location from mock
    
    expect(screen.getByRole('link', { name: 'Inventory' }).firstChild).toHaveClass('text-neutral-500');
    expect(screen.getByRole('link', { name: 'Stats' }).firstChild).toHaveClass('text-primary');
  });
});

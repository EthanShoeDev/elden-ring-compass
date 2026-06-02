import { TooltipProvider } from '../ui/tooltip';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultThemePreference='system'>
      <TooltipProvider delay={300}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}

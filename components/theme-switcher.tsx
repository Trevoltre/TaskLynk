"use client";

import { useTheme } from '@/lib/theme-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette, Check } from 'lucide-react';

const themes = [
  { value: 'professional', label: 'Professional', description: 'Light (Navy & Orange)', color: 'bg-gradient-to-r from-blue-900 to-orange-500' },
  { value: 'dark', label: 'Dark', description: 'Deep Navy & Amber', color: 'bg-gradient-to-r from-slate-900 to-amber-600' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Color Themes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value as any)}
            className="cursor-pointer py-3"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${t.color} border-2 border-border shadow-md`} />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </div>
              </div>
              {theme === t.value && <Check className="h-4 w-4 text-primary" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
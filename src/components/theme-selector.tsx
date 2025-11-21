"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Palette } from 'lucide-react';
import { Button } from "@/components/ui/button"

export function ThemeSelector() {
  const { setTheme, theme } = useTheme()

  const themes = [
    { name: 'Light', value: 'light', icon: Sun },
    { name: 'Dark', value: 'dark', icon: Moon },
    { name: 'Vaporwave', value: 'vaporwave', icon: Palette },
  ];

  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">Theme</p>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((t) => (
          <Button
            key={t.value}
            variant={theme === t.value ? 'default' : 'outline'}
            onClick={() => setTheme(t.value)}
            className="flex flex-col h-20"
          >
            <t.icon className="w-6 h-6 mb-1" />
            <span>{t.name}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

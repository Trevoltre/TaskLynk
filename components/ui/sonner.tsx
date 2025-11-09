"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          // Success Toast - Green with brand styling
          success: `
            group-[.toaster]:bg-green-50 
            group-[.toaster]:dark:bg-green-950/30 
            group-[.toaster]:text-green-900 
            group-[.toaster]:dark:text-green-100 
            group-[.toaster]:border-2 
            group-[.toaster]:border-green-600 
            group-[.toaster]:shadow-lg 
            group-[.toaster]:backdrop-blur-md
          `,
          // Error Toast - Red with brand styling
          error: `
            group-[.toaster]:bg-red-50 
            group-[.toaster]:dark:bg-red-950/30 
            group-[.toaster]:text-red-900 
            group-[.toaster]:dark:text-red-100 
            group-[.toaster]:border-2 
            group-[.toaster]:border-red-600 
            group-[.toaster]:shadow-lg 
            group-[.toaster]:backdrop-blur-md
          `,
          // Warning Toast - Orange/Amber
          warning: `
            group-[.toaster]:bg-orange-50 
            group-[.toaster]:dark:bg-orange-950/30 
            group-[.toaster]:text-orange-900 
            group-[.toaster]:dark:text-orange-100 
            group-[.toaster]:border-2 
            group-[.toaster]:border-orange-600 
            group-[.toaster]:shadow-lg 
            group-[.toaster]:backdrop-blur-md
          `,
          // Info Toast - Blue
          info: `
            group-[.toaster]:bg-blue-50 
            group-[.toaster]:dark:bg-blue-950/30 
            group-[.toaster]:text-blue-900 
            group-[.toaster]:dark:text-blue-100 
            group-[.toaster]:border-2 
            group-[.toaster]:border-blue-600 
            group-[.toaster]:shadow-lg 
            group-[.toaster]:backdrop-blur-md
          `,
          // Default/Loading Toast
          toast: `
            group-[.toaster]:bg-card 
            group-[.toaster]:text-foreground 
            group-[.toaster]:border-2 
            group-[.toaster]:border-border 
            group-[.toaster]:shadow-lg 
            group-[.toaster]:backdrop-blur-md
          `,
          // Toast description
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          // Action button
          actionButton: `
            group-[.toast]:bg-primary 
            group-[.toast]:text-primary-foreground 
            group-[.toast]:hover:bg-primary/90 
            group-[.toast]:border 
            group-[.toast]:border-primary
          `,
          // Cancel button
          cancelButton: `
            group-[.toast]:bg-muted 
            group-[.toast]:text-muted-foreground 
            group-[.toast]:hover:bg-muted/80
          `,
          // Success icon color
          successIcon: "text-green-600 dark:text-green-400",
          // Error icon color
          errorIcon: "text-red-600 dark:text-red-400",
          // Warning icon color
          warningIcon: "text-orange-600 dark:text-orange-400",
          // Info icon color
          infoIcon: "text-blue-600 dark:text-blue-400",
        },
        style: {
          borderRadius: '0.75rem',
          padding: '1rem',
          fontSize: '0.95rem',
          fontWeight: '500',
        },
        duration: 4000,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
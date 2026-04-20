import { useTheme } from "@/components/theme-provider";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-[22px] group-[.toaster]:px-5 group-[.toaster]:py-4",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:mt-1",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-bold group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:h-9 group-[.toast]:transition-all group-[.toast]:hover:scale-105 group-[.toast]:active:scale-95",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:h-9",
          title: "group-[.toast]:font-bold group-[.toast]:text-base",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--description-color": "var(--muted-foreground)",
          "--action-color": "var(--primary)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

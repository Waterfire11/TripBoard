// src/components/common/Loader.tsx
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function Loader({ size = "md", className, text }: LoaderProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeMap[size])} />
      {text && (
        <p className="text-sm text-muted-foreground text-center">
          {text}
        </p>
      )}
    </div>
  );
}
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input/80 bg-input/25 px-3.5 py-2.5 text-base shadow-sm transition-[color,box-shadow,border-color,background-color] outline-none placeholder:text-muted-foreground/70 hover:border-input hover:bg-input/35 focus-visible:border-ring focus-visible:bg-input/40 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:border-input/60 disabled:bg-input/50 disabled:opacity-50 disabled:hover:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/20 dark:hover:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

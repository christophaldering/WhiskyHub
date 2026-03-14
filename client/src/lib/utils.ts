import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripGuestSuffix(name: string): string {
  return name.replace(/ #[a-z0-9]{4}$/i, "");
}

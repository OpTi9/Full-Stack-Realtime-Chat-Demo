import {ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

// manage conditional classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
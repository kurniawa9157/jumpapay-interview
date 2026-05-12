import { useEffect, useState } from "react";
import {
  DEFAULT_APPEARANCE_TEMPLATE,
  type AppearanceTemplate,
} from "./types/appearance.types";

let currentAppearance: AppearanceTemplate = DEFAULT_APPEARANCE_TEMPLATE;
const listeners = new Set<() => void>();

export function getCurrentAppearance(): AppearanceTemplate {
  return currentAppearance;
}

export function setCurrentAppearance(next: AppearanceTemplate): void {
  currentAppearance = next;
  listeners.forEach((listener) => listener());
}

export function subscribeAppearance(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppearance(): AppearanceTemplate {
  const [appearance, setAppearance] = useState(currentAppearance);

  useEffect(() => {
    return subscribeAppearance(() => setAppearance(currentAppearance));
  }, []);

  return appearance;
}

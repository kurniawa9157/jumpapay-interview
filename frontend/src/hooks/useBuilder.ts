import { useState, useCallback } from "react";
import {
  type BuilderComponent,
  type ComponentType,
  COMPONENT_DEFAULTS,
  generateId,
} from "../types/builder.types";

// useBuilder — pure React state mgmt untuk builder canvas.
// Port mentah dari template-go/.../use-builder.ts (no dep ke router/query).
export function useBuilder(initial: BuilderComponent[] = []) {
  const [components, setComponents] = useState<BuilderComponent[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const selected = components.find((c) => c.id === selectedId) ?? null;

  const addComponent = useCallback((type: ComponentType) => {
    const comp: BuilderComponent = {
      id: generateId(),
      type,
      props: { ...COMPONENT_DEFAULTS[type] },
    };
    setComponents((prev) => [...prev, comp]);
    setSelectedId(comp.id);
    setIsDirty(true);
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    setIsDirty(true);
  }, []);

  const duplicateComponent = useCallback((id: string) => {
    setComponents((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const clone: BuilderComponent = {
        id: generateId(),
        type: prev[idx].type,
        props: JSON.parse(JSON.stringify(prev[idx].props)),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
    setIsDirty(true);
  }, []);

  const updateProp = useCallback(
    (key: string, value: unknown) => {
      setComponents((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, props: { ...c.props, [key]: value } }
            : c,
        ),
      );
      setIsDirty(true);
    },
    [selectedId],
  );

  const updatePropById = useCallback(
    (compId: string, key: string, value: unknown) => {
      setComponents((prev) =>
        prev.map((c) =>
          c.id === compId
            ? { ...c, props: { ...c.props, [key]: value } }
            : c,
        ),
      );
      setIsDirty(true);
    },
    [],
  );

  const moveComponent = useCallback((fromIndex: number, toIndex: number) => {
    setComponents((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setIsDirty(true);
  }, []);

  const loadLayout = useCallback((layout: BuilderComponent[]) => {
    setComponents(layout);
    setSelectedId(null);
    setIsDirty(false);
  }, []);

  const markSaved = useCallback(() => {
    setIsDirty(false);
  }, []);

  return {
    components,
    selected,
    selectedId,
    isDirty,
    setSelectedId,
    addComponent,
    removeComponent,
    duplicateComponent,
    updateProp,
    updatePropById,
    moveComponent,
    loadLayout,
    markSaved,
  };
}

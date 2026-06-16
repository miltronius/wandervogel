import { useCallback, useState } from "react";
import type { PlannedHike } from "../types";

const STORAGE_KEY = "wandervogel.plannedHikes.v1";

function load(): PlannedHike[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlannedHike[]) : [];
  } catch {
    return [];
  }
}

function persist(plans: PlannedHike[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function usePlannedHikes() {
  const [plans, setPlans] = useState<PlannedHike[]>(() => load());

  const savePlan = useCallback((plan: PlannedHike) => {
    setPlans((prev) => {
      const next = [...prev.filter((p) => p.id !== plan.id), plan];
      persist(next);
      return next;
    });
  }, []);

  const removePlan = useCallback((id: string) => {
    setPlans((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { plans, savePlan, removePlan };
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LessonData } from "@/lib/curriculum";

const LessonDataContext = createContext<LessonData | null>(null);

/** Gives <QuickCheck> and <Term> inside a lesson body access to that lesson's data. */
export function LessonDataProvider({ data, children }: { data: LessonData; children: ReactNode }) {
  return <LessonDataContext.Provider value={data}>{children}</LessonDataContext.Provider>;
}

/** The current lesson's data, or null outside a LessonDataProvider. */
export function useLessonData(): LessonData | null {
  return useContext(LessonDataContext);
}

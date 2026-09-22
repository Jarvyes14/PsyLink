'use client';
import { createContext, useContext } from 'react';
import type { Overview, User } from '@/lib/types';
export const AppContext = createContext<{ user: User; data: Overview; refresh: () => Promise<void>; notify: (message: string, error?: boolean) => void } | null>(null);
export function useApp() { const app = useContext(AppContext); if (!app) throw new Error('App context unavailable'); return app; }

"use client";
import {useCallback,useEffect} from 'react';
import {focusActions} from '@/lib/use-focus-session';
import FocusSessionPanel from './FocusSessionPanel';
// Retained for older callers, using the same paused/manual-phase controller.
export default function PomodoroModal({onClose}:{gapMinutes?:number|null;onClose:()=>void}) {
 useEffect(()=>{focusActions.foreground(true);return()=>focusActions.foreground(false);},[]);
 const minimize=useCallback(()=>{focusActions.foreground(false);onClose();},[onClose]);
 return <div className="desk-focus-layer"><FocusSessionPanel onMinimize={minimize}/></div>;
}

"use client";
import {useEffect,useRef} from "react";
export default function FocusChoice({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} className="desk-dialog focus-choice" aria-labelledby="focus-choice-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><h2 id="focus-choice-title">{title}</h2>{children}<button type="button" onClick={onClose}>Cancel</button></dialog>;
}

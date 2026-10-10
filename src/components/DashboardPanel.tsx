'use client';
import {useRef,type ReactNode} from 'react';
import type {PanelId,PanelPreference} from '@/lib/dashboard-layout';
export default function DashboardPanel({id,title,span=12,displayOrder,preference,onChange,children}:{id:PanelId;title:string;span?:5|6|7|12;displayOrder?:number;preference:PanelPreference;onChange:(id:PanelId,value:PanelPreference)=>void;children:ReactNode}) {
 const menu=useRef<HTMLDetailsElement>(null),trigger=useRef<HTMLElement>(null);
 function change(patch:Partial<PanelPreference>){if(menu.current)menu.current.open=false;onChange(id,{...preference,...patch});trigger.current?.focus();}
 if(preference.hidden)return null;
 return <div id={id} className={`dashboard-panel panel-span${span}${preference.collapsed?' is-collapsed':''}`} data-panel={id} style={{order:displayOrder ?? preference.order}}>
  <div className="panel-tools"><h2>{title}</h2><button type="button" aria-expanded={!preference.collapsed} aria-controls={`panel-content-${id}`} aria-label={`${preference.collapsed?"Expand":"Collapse"} ${title}`} onClick={()=>change({collapsed:!preference.collapsed})}>{preference.collapsed?"Expand":"Collapse"}</button>
   <details className="panel-options" ref={menu} onKeyDown={e=>{if(e.key==="Escape"&&menu.current?.open){e.stopPropagation();menu.current.open=false;trigger.current?.focus();}}}><summary ref={trigger} aria-label={`${title} options`}>•••</summary><div className="panel-options-list"><button type="button" onClick={()=>change({collapsed:!preference.collapsed})}>{preference.collapsed?'Expand':'Collapse'}</button><button type="button" onClick={()=>change({pinned:!preference.pinned})}>{preference.pinned?'Unpin shortcut':'Pin shortcut'}</button><button type="button" onClick={()=>change({hidden:true})}>Hide panel</button></div></details>
  </div>
  <div id={`panel-content-${id}`} hidden={preference.collapsed}>{!preference.collapsed&&children}</div>
 </div>;
}

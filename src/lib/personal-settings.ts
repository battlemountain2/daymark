import type {DashboardLayout} from "./dashboard-layout";
export function personalSettings(layout:DashboardLayout){
  return {
    name:typeof layout.greetingName==='string'&&layout.greetingName.trim()?layout.greetingName.trim().slice(0,40):'Brayan',
    textSize:layout.textSize==='large'?'large':'standard',
    workoutUnit:layout.workoutUnit==='kg'?'kg':'lb',
    travelBuffer:typeof layout.travelBuffer==='number'&&Number.isInteger(layout.travelBuffer)&&layout.travelBuffer>=0&&layout.travelBuffer<=45?layout.travelBuffer:10,
  };
}

export type GitHubRepository = {fullName:string;url:string;description:string;language:string|null;updatedAt:string;defaultBranch:string;openItems:number};
export type Project = {title:string;note:string;next?:string;repository?:GitHubRepository;taskIds?:string[]};
export function validGitHubOwner(value:string) {return /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);}
export function githubRepository(value:string):{owner:string;name:string;url:string;fullName:string}|null {
  try {
    const url=new URL(value.trim());
    if(url.protocol!=="https:"||url.hostname!=="github.com"||url.port||url.username||url.password||url.search||url.hash)return null;
    const parts=url.pathname.replace(/\/$/,"").split("/").slice(1);
    if(parts.length!==2||!validGitHubOwner(parts[0]))return null;
    const name=parts[1].replace(/\.git$/,"");
    if(!/^[a-z\d_.-]{1,100}$/i.test(name)||[".",".."].includes(name))return null;
    return {owner:parts[0],name,url:`https://github.com/${parts[0]}/${name}`,fullName:`${parts[0]}/${name}`};
  }catch{return null;}
}
export function repositoryDetails(raw:Record<string,unknown>):GitHubRepository|null {
  const parsed=githubRepository(String(raw.html_url||""));
  if(!parsed||raw.private===true)return null;
  return {fullName:parsed.fullName,url:parsed.url,description:String(raw.description||"").slice(0,500),language:typeof raw.language==="string"?raw.language:null,updatedAt:String(raw.pushed_at||raw.updated_at||""),defaultBranch:String(raw.default_branch||"main"),openItems:typeof raw.open_issues_count==="number"?raw.open_issues_count:0};
}
export function projectTaskId(id:string,title:string) {
  let hash=2166136261;for(const char of title)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return `project:${id.slice(0,40).replace(/[^a-z\d_-]/gi,"_")}:${(hash>>>0).toString(36)}`;
}

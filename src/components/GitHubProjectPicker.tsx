"use client";
import {useState} from "react";
import {githubRepository,type GitHubRepository} from "@/lib/github-projects";
export default function GitHubProjectPicker({onAdd,existing}:{onAdd:(repo:GitHubRepository)=>boolean;existing:string[]}) {
  const [owner,setOwner]=useState("battlemountain2"),[url,setUrl]=useState(""),[repos,setRepos]=useState<GitHubRepository[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function load(repository?:string){
    setBusy(true);setError("");try{
      const response=await fetch(`/api/github-projects?${new URLSearchParams(repository?{repository}:{owner})}`);const data=await response.json();
      if(!response.ok)throw Error(data.error||"Could not load GitHub projects.");
      if(repository){if(data.repositories[0]&&onAdd(data.repositories[0]))setUrl("");}
      else setRepos(data.repositories);
    }catch(e){setError(e instanceof Error?e.message:"Could not load GitHub projects.");}finally{setBusy(false);}
  }
  function addLink(){const parsed=githubRepository(url);if(!parsed){setError("Use a repository link such as https://github.com/battlemountain2/strata.");return;}if(onAdd({...parsed,description:"",language:null,updatedAt:"",defaultBranch:"",openItems:0}))setUrl("");}
  return <details className="github-project-picker"><summary>Add a GitHub project</summary><p className="sub">Choose a public repository, or paste a link. Your notes and tasks stay in Daymark.</p>
    <form className="github-project-form" onSubmit={e=>{e.preventDefault();void load();}}><label>GitHub username<input value={owner} onChange={e=>setOwner(e.target.value)} required maxLength={39}/></label><button type="submit" disabled={busy}>{busy?"Loading…":"Find repositories"}</button></form>
    <div className="github-repository-list">{repos.map(repo=><div key={repo.fullName}><strong>{repo.fullName.split("/")[1]}</strong><p className="sub">{repo.description||repo.language||"GitHub repository"}</p><button type="button" disabled={existing.includes(repo.fullName.toLowerCase())} onClick={()=>onAdd(repo)}>{existing.includes(repo.fullName.toLowerCase())?"Added":"Add project"}</button></div>)}</div>
    <form className="github-project-form" onSubmit={e=>{e.preventDefault();void load(url);}}><label>Repository link<input type="url" value={url} onChange={e=>setUrl(e.target.value)} required placeholder="https://github.com/owner/repository"/></label><button type="submit" disabled={busy}>Add repository</button></form>
    {error&&<p role="alert">{error}</p>}{url&&<button type="button" onClick={addLink}>Save link without fetching details</button>}
  </details>;
}

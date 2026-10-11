import {isSignedIn} from "@/lib/auth";
import {githubRepository,validGitHubOwner,repositoryDetails} from "@/lib/github-projects";

export async function GET(request:Request) {
  if(!await isSignedIn())return Response.json({error:"Sign in to view projects."},{status:401});
  const query=new URL(request.url).searchParams, owner=query.get("owner"), repository=query.get("repository");
  const parsed=repository?githubRepository(repository):null;
  if(repository&&!parsed||!repository&&(!owner||!validGitHubOwner(owner)))return Response.json({error:"Enter a GitHub username or a repository link."},{status:400});
  const endpoint=parsed?`repos/${parsed.owner}/${parsed.name}`:`users/${owner}/repos?sort=updated&per_page=100&type=owner`;
  try {
    const response=await fetch(`https://api.github.com/${endpoint}`,{headers:{Accept:"application/vnd.github+json","User-Agent":"daymark-projects","X-GitHub-Api-Version":"2026-03-10"},next:{revalidate:600},signal:AbortSignal.timeout(10000)});
    if(!response.ok)return Response.json({error:response.status===404?"That public repository or username could not be found. Private repos can still be saved as links.":"GitHub details are temporarily unavailable. You can still save a repository link."},{status:response.status===404?404:502});
    const raw=await response.json();
    const repositories=(Array.isArray(raw)?raw:[raw]).map(repositoryDetails).filter(Boolean);
    return Response.json({repositories},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return Response.json({error:"GitHub did not respond. Try again or save the link without details."},{status:502});}
}

import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { readState, setTick, setDismissed, addTodo, setTodoDone, deleteTodo } from "@/lib/db";

const deny = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await isSignedIn())) return deny();
  return NextResponse.json(await readState());
}

/**
 * One endpoint, an `action` discriminator. Small enough that separate routes
 * would be ceremony; if this grows past ~6 actions, split it.
 */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return deny();
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "bad request" }, { status: 400 });

  switch (body.action) {
    case "tick":
      await setTick(String(body.key), !!body.done);
      break;
    case "dismiss":
      await setDismissed(String(body.key), !!body.hidden);
      break;
    case "addTodo": {
      const title = String(body.title ?? "").trim();
      const due = String(body.due ?? "");
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
        return NextResponse.json({ error: "title and due (YYYY-MM-DD) required" }, { status: 400 });
      }
      // An id from the client makes a replayed create a no-op rather than a
      // duplicate. Constrained so a caller can't write arbitrary keys.
      const supplied = String(body.id ?? "");
      const clientId = /^[a-z0-9:_-]{6,64}$/i.test(supplied) ? supplied : undefined;
      const id = await addTodo(title, due, clientId);
      return NextResponse.json({ ok: true, id, state: await readState() });
    }
    case "todoDone":
      await setTodoDone(String(body.id), !!body.done);
      break;
    case "deleteTodo":
      await deleteTodo(String(body.id));
      break;
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, state: await readState() });
}

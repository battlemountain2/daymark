#!/usr/bin/env python3
"""
Daymark Dual-Agent Note Enrichment Script
Shares cognitive load between Gemini (deep syllabus grounding & Wiki-Links)
and ChatGPT (high-yield active recall Anki card mining).
Includes zero-dependency HTTP calls with graceful fallback to syllabus rules.
"""

import os
import sys
import glob
import json
import re
import urllib.request
import urllib.error
from datetime import datetime

VAULT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src/data/vault")
COURSE_STATUS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src/data/study-hub/course-status.json")
ENV_LOCAL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")

def get_api_keys():
    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if (not gemini_key or gemini_key == "[SENSITIVE]") or (not openai_key or openai_key == "[SENSITIVE]"):
        if os.path.exists(ENV_LOCAL_PATH):
            try:
                with open(ENV_LOCAL_PATH, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GEMINI_API_KEY="):
                            val = line.split("=", 1)[1].strip('"').strip("'")
                            if val and val != "[SENSITIVE]":
                                gemini_key = val
                        elif line.startswith("OPENAI_API_KEY="):
                            val = line.split("=", 1)[1].strip('"').strip("'")
                            if val and val != "[SENSITIVE]":
                                openai_key = val
            except Exception:
                pass

    if gemini_key == "[SENSITIVE]":
        gemini_key = None
    if openai_key == "[SENSITIVE]":
        openai_key = None

    return gemini_key, openai_key

def load_course_status():
    if os.path.exists(COURSE_STATUS_PATH):
        try:
            with open(COURSE_STATUS_PATH, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading course status: {e}")
    return {}

def parse_frontmatter(content):
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    fm_text = parts[1]
    body = parts[2].strip()
    fm = {}
    for line in fm_text.strip().split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm, body

def call_gemini_synthesis(body, course, gemini_key, current_topic, readings):
    prompt = f"""You are an academic research copilot for a UNM undergraduate studying {course} (Fall 2026 Week 5).
Topic Context: {current_topic}
Readings: {", ".join(readings)}

Student Notes:
\"\"\"
{body[:3500]}
\"\"\"

Synthesize these lecture notes into an Obsidian-style markdown section:
1. "### 📚 Syllabus & Reading Context": Connect notes to Week 5 topics, readings, and regional New Mexico geography/history.
2. "### 🔗 Connected Concepts & Wiki-Links": 3-5 [[Wiki-Links]] to related concepts.
3. Callout:
> [!NOTE] Exam Focus
> [1-2 sentence high-yield insight]
Return ONLY markdown."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1000}
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"  [Gemini API notice]: {e}")
        return None

def call_openai_cards(body, synthesis_text, course, openai_key):
    prompt = f"""You are an active recall flashcard specialist for UNM course {course}.
Extract 2 to 4 high-yield active recall flashcards from the student notes and synthesis below.

Student Notes:
\"\"\"
{body[:3000]}
\"\"\"

Synthesis:
\"\"\"
{synthesis_text[:2000]}
\"\"\"

Return a valid JSON object matching:
{{
  "cards": [
    {{
      "front": "Question",
      "back": "Answer",
      "topic": "Concept"
    }}
  ]
}}"""

    url = "https://api.openai.com/v1/chat/completions"
    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You generate active recall flashcards in JSON format with a cards array."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {openai_key}"
    })
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content = res_data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return parsed.get("cards", [])
    except Exception as e:
        print(f"  [OpenAI API notice]: {e}")
        return None

def enrich_note(course, title, body, status_data, gemini_key, openai_key):
    date_str = datetime.now().strftime("%Y-%m-%d")
    courses = status_data.get("courses", [])
    active_course = next((c for c in courses if c.get("code") == course), None)
    
    current_topic = active_course.get("currentTopic", "Midterm Synthesis & Conceptual Applications") if active_course else "Active Term Synthesis"
    readings = active_course.get("readings", ["Assigned course syllabus readings"]) if active_course else []

    synthesis_markdown = None
    synthesis_provider = "Daymark Engine"
    if gemini_key:
        synthesis_markdown = call_gemini_synthesis(body, course, gemini_key, current_topic, readings)
        if synthesis_markdown:
            synthesis_provider = "Gemini 1.5 Flash"

    if not synthesis_markdown:
        synthesis_markdown = f"""### 📚 Syllabus & Reading Context
* **Course**: {course}
* **Current Topic (Week 5)**: {current_topic}
* **Assigned Readings**:
"""
        for r in readings:
            synthesis_markdown += f"  - {r}\n"
        synthesis_markdown += f"""
### 🔗 Connected Concepts & Wiki-Links
* Links to: `[[{course} Week 5 Synthesis]]`
* Links to: `[[Albuquerque Regional Geography]]`
* Links to: `[[Dynamic Equilibrium]]`
"""

    cards = None
    cards_provider = "Daymark Engine"
    if openai_key:
        cards = call_openai_cards(body, synthesis_markdown, course, openai_key)
        if cards:
            cards_provider = "ChatGPT 4o-mini"

    if not cards:
        cards = []
        lines = [l.strip() for l in body.split("\n") if l.strip().startswith("-") or l.strip().startswith("*")]
        for line in lines[:3]:
            clean_text = line.lstrip("-* ").strip()
            if len(clean_text) > 15:
                cards.append({
                    "front": f"Explain the core concept: {clean_text[:60]}...",
                    "back": clean_text
                })
        if not cards:
            cards.append({
                "front": f"What is the central focus of {course} in Week 5?",
                "back": f"Applied synthesis of {current_topic} in New Mexico environmental and spatial systems."
            })

    provider_name = synthesis_provider if synthesis_provider == cards_provider else f"{synthesis_provider} + {cards_provider}"

    enrichment = [
        "",
        "---",
        "",
        "## ✦ Agent Synthesis & Syllabus Connections",
        "",
        synthesis_markdown,
        "",
        "### 🎯 Auto-Generated Anki Cards",
    ]

    for c in cards:
        enrichment.append(f"* **Front**: {c.get('front', '')}")
        enrichment.append(f"  * **Back**: {c.get('back', '')}")

    enrichment.extend([
        "",
        f"> [!NOTE] Copilot Verification ({provider_name})",
        f"> Processed and aligned with Fall 2026 syllabus on {date_str} by Daymark Agent Copilot.",
        ""
    ])

    return body + "\n" + "\n".join(enrichment), provider_name

def process_vault():
    gemini_key, openai_key = get_api_keys()
    print("=" * 60)
    print("Daymark Dual-Agent Note Processor")
    print(f"Gemini API: {'Connected' if gemini_key else 'Fallback (Rule-Engine)'}")
    print(f"OpenAI API: {'Connected' if openai_key else 'Fallback (Rule-Engine)'}")
    print("=" * 60)

    status_data = load_course_status()
    notes_pattern = os.path.join(VAULT_DIR, "**/*.md")
    files = glob.glob(notes_pattern, recursive=True)
    
    processed_count = 0
    for path in files:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        fm, body = parse_frontmatter(content)
        if fm.get("agent_status") in ["raw", "pending"]:
            course = fm.get("course", "GEOG 1160")
            title = fm.get("title", "Lecture Note")
            print(f"\nEnriching note: {os.path.basename(path)} ({course})...")
            
            enriched_body, provider = enrich_note(course, title, body, status_data, gemini_key, openai_key)
            
            fm["agent_status"] = "enriched"
            fm["enriched_at"] = datetime.now().isoformat()
            fm["enriched_by"] = provider
            
            fm_lines = ["---"]
            for k, v in fm.items():
                fm_lines.append(f'{k}: "{v}"')
            fm_lines.append("---")
            fm_lines.append("")
            
            new_content = "\n".join(fm_lines) + enriched_body
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
                
            processed_count += 1
            print(f"✓ Enriched {os.path.basename(path)} via [{provider}]")
            
    print(f"\nDone! Processed {processed_count} notes.")

if __name__ == "__main__":
    process_vault()

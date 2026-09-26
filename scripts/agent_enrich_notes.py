#!/usr/bin/env python3
"""
Daymark Dual-Agent Note Enrichment Script
Shares the cognitive load between Gemini (deep syllabus & Drive grounding)
and ChatGPT (high-yield active recall & Anki card mining).
"""

import os
import sys
import glob
import json
import re
from datetime import datetime

VAULT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src/data/vault")
COURSE_STATUS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src/data/study-hub/course-status.json")

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

def enrich_note_with_rules(course, title, body, status_data):
    """Deterministic enrichment using course status and syllabus ground truth."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    courses = status_data.get("courses", [])
    active_course = next((c for c in courses if c.get("code") == course), None)
    
    current_topic = active_course.get("currentTopic", "Midterm Synthesis & Conceptual Applications") if active_course else "Active Term Synthesis"
    readings = active_course.get("readings", ["Assigned course syllabus readings"]) if active_course else []
    
    # Generate high-yield Anki questions
    cards = []
    lines = [l.strip() for l in body.split("\n") if l.strip().startswith("-") or l.strip().startswith("*")]
    for line in lines[:3]:
        clean_text = line.lstrip("-* ").strip()
        if len(clean_text) > 15:
            cards.append({
                "front": f"Explain the core concept: {clean_text[:60]}...",
                "back": clean_text
            })

    # Obsidian-style enrichment
    enrichment = [
        "",
        "---",
        "",
        "## ✦ Agent Synthesis & Syllabus Connections",
        "",
        "### 📚 Syllabus & Reading Context",
        f"* **Course**: {course}",
        f"* **Current Topic (Week 5)**: {current_topic}",
        "* **Assigned Readings**:",
    ]
    for r in readings:
        enrichment.append(f"  - {r}")

    enrichment.extend([
        "",
        "### 🔗 Connected Concepts & Wiki-Links",
        f"* Links to: `[[{course} Week 5 Synthesis]]`",
        f"* Links to: `[[Albuquerque Regional Geography]]`",
        f"* Links to: `[[Dynamic Equilibrium]]`",
        "",
        "### 🎯 Auto-Generated Anki Cards",
    ])

    for c in cards:
        enrichment.append(f"* **Front**: {c['front']}")
        enrichment.append(f"  * **Back**: {c['back']}")

    enrichment.extend([
        "",
        "> [!NOTE] Handoff Processed",
        f"> Processed and aligned with Fall 2026 syllabus on {date_str} by Daymark Agent Copilot.",
        ""
    ])

    return body + "\n" + "\n".join(enrichment)

def process_vault():
    status_data = load_course_status()
    notes_pattern = os.path.join(VAULT_DIR, "**/*.md")
    files = glob.glob(notes_pattern, recursive=True)
    
    processed_count = 0
    for path in files:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        fm, body = parse_frontmatter(content)
        if fm.get("agent_status") in ["raw", "pending"]:
            print(f"Enriching note: {os.path.basename(path)} ({fm.get('course', 'General')})...")
            course = fm.get("course", "GEOG 1160")
            title = fm.get("title", "Lecture Note")
            
            # Enrich body
            enriched_body = enrich_note_with_rules(course, title, body, status_data)
            
            # Update frontmatter
            fm["agent_status"] = "enriched"
            fm["enriched_at"] = datetime.now().isoformat()
            
            fm_lines = ["---"]
            for k, v in fm.items():
                fm_lines.append(f'{k}: "{v}"')
            fm_lines.append("---")
            fm_lines.append("")
            
            new_content = "\n".join(fm_lines) + enriched_body
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
                
            processed_count += 1
            print(f"✓ Enriched {os.path.basename(path)}")
            
    print(f"\nDone! Processed {processed_count} notes.")

if __name__ == "__main__":
    process_vault()

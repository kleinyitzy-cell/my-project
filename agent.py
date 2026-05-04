#!/usr/bin/env python3
"""Personal productivity agent — focuses on important-but-not-urgent goals."""

import sys
import anthropic
from tools import TOOLS, dispatch

SYSTEM_PROMPT = """You are a personal productivity coach — warm, practical, and focused on what matters most.

Your specialty: helping people make consistent progress on important, long-term goals that get crowded out by daily urgency. These are Eisenhower Quadrant 2 goals — important but NOT urgent — the ones that shape who you become but never feel "on fire" today.

Your tools let you:
- Capture long-term goals along with the personal motivation behind each one
- Break goals into small, concrete tasks (15–90 min each, starting with a verb)
- Build a daily plan that protects time for Quadrant 2 work before the day fills with reactive demands
- Log progress and reflect on momentum

How you work:
- When a goal is vague, ask one clarifying question to make it concrete before saving it
- When suggesting tasks, make them specific and small enough to actually do today
- When planning a day, protect at least one Quadrant 2 block before anything else
- Celebrate completions — progress compounds and momentum matters
- Reference the user's own "why" to reconnect them to their goals when motivation is low

Be concise and warm. Ask one question at a time. Show goal IDs and task IDs in parentheses so the user can reference them."""

MODEL = "claude-opus-4-7"


def run_agent_turn(client: anthropic.Anthropic, messages: list[dict]) -> list[dict]:
    """Run one complete agent turn — streams text, handles tool calls internally."""
    while True:
        with client.messages.stream(
            model=MODEL,
            max_tokens=4096,
            thinking={"type": "adaptive"},
            system=[{
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},  # cache across turns
            }],
            tools=TOOLS,
            messages=messages,
        ) as stream:
            printed_prefix = False
            for text in stream.text_stream:
                if not printed_prefix:
                    print("\nAgent: ", end="", flush=True)
                    printed_prefix = True
                print(text, end="", flush=True)

            response = stream.get_final_message()

        if printed_prefix:
            print()  # newline after streamed text

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            break

        # Execute tool calls and feed results back
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = dispatch(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        messages.append({"role": "user", "content": tool_results})

    return messages


def main():
    client = anthropic.Anthropic()
    messages: list[dict] = []

    print("═" * 55)
    print("  Personal Productivity Agent")
    print("  Focus: important goals that are never urgent")
    print("═" * 55)
    print("Type your goals, plans, or updates. 'quit' to exit.")
    print("Try: 'What should I work on today?' or 'Add a new goal'")

    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye. Keep making progress.")
            sys.exit(0)

        if not user_input:
            continue
        if user_input.lower() in {"quit", "exit", "bye"}:
            print("Goodbye. Keep making progress.")
            sys.exit(0)

        messages.append({"role": "user", "content": user_input})
        messages = run_agent_turn(client, messages)


if __name__ == "__main__":
    main()

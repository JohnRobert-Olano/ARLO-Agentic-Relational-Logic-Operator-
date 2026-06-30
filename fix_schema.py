import json
import sys
import re

def update_workflow(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for node in data.get('nodes', []):
        if node.get('name') == 'Get Financial Summary':
            # Update descriptions for fromAI to instruct LLM to always provide empty string instead of omitting
            val = node['parameters']['workflowInputs']['value']
            val['timeframe'] = "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('timeframe', `e.g. today, this_month. If asking for overall balance or no time specified, output 'ALL'. MUST provide this key.`, 'string') }}"
            val['category'] = "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('category', `e.g. Food, Transport. If asking for overall balance, income, or expense, output 'ALL'. DO NOT use 'Income' or 'Expense' as categories. MUST provide this key.`, 'string') }}"
            val['search_term'] = "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('search_term', `e.g. internet. If no specific item mentioned, output empty string ''. MUST provide this key.`, 'string') }}"
            node['parameters']['workflowInputs']['value'] = val
            
        if node.get('name') == 'AI Agent':
            sys_msg = node['parameters']['options']['systemMessage']
            if "For Financial Summary:" in sys_msg:
                # Make sure it explicitly says to provide all keys
                # We do a regex replace or just string replace. To be safe since we modified it once, we can just replace the whole instruction part.
                sys_msg = re.sub(
                    r"For Financial Summary:.*?(?=\\n   - For Tasks:)",
                    "For Financial Summary: Infer timeframe (e.g. today, this_month, ALL), category (e.g. Food, ALL), search_term. If user asks 'wallet balance', 'total income', or 'total expense', use 'ALL' for category. The tool returns both income and expense totals automatically, so DO NOT filter category by 'Income' or 'Expense'. MUST provide all 3 keys in JSON. Use empty string \"\" if no search term.",
                    sys_msg
                )
                node['parameters']['options']['systemMessage'] = sys_msg

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

print("Fixing web chat workflow")
update_workflow('n8n/n8n-web-chat-workflow.json')

print("Fixing main workflow")
update_workflow('n8n/n8n-workflow.json')

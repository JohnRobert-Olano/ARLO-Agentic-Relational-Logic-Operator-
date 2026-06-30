import json
import sys

def update_workflow(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Update AI Agent system prompt
    for node in data.get('nodes', []):
        if node.get('name') == 'AI Agent':
            sys_msg = node['parameters']['options']['systemMessage']
            sys_msg = sys_msg.replace(
                "'Log Finances', 'Add Task', or 'Schedule Event'",
                "'Log Finances', 'Add Task', 'Schedule Event', or 'Get Financial Summary'"
            )
            if "For Financial Summary" not in sys_msg:
                parts = sys_msg.split("For Tasks: Infer title, priority")
                if len(parts) == 2:
                    sys_msg = parts[0] + "For Financial Summary: Infer timeframe (e.g., \"today\", \"this_week\", \"this_month\", \"last_month\", \"weekend\"), category (e.g., \"Food\", \"Transport\", \"ALL\"), search_term (string to filter by description).\\n   - For Tasks: Infer title, priority" + parts[1]
            
            node['parameters']['options']['systemMessage'] = sys_msg

    # 2. Add Get Financial Summary node if not exists
    node_exists = any(n.get('name') == 'Get Financial Summary' for n in data.get('nodes', []))
    if not node_exists:
        new_node = {
            "parameters": {
                "description": "Use this tool to calculate financial summaries, check wallet balances, or lookup specific transactions. Optional params: timeframe (e.g. today, this_week, this_month, last_month, weekend), category (e.g. Food, Transport, or ALL), search_term (string to filter by description).",
                "workflowId": {
                    "__rl": True,
                    "value": "get-fin-sum-workflow-v1",
                    "mode": "id",
                    "cachedResultUrl": "",
                    "cachedResultName": "Get Financial Summary"
                },
                "workflowInputs": {
                    "mappingMode": "defineBelow",
                    "value": {
                        "timeframe": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('timeframe', `e.g., \"today\", \"this_month\", \"last_month\". Default is all time.`, 'string') }}",
                        "category": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('category', `e.g., \"Food\", \"Utilities\", or \"ALL\"`, 'string') }}",
                        "search_term": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('search_term', `e.g., \"internet\", \"dog food\"`, 'string') }}",
                        "user_id": "={{ $json.body.message.chat.id }}"
                    },
                    "matchingColumns": [],
                    "schema": [
                        {
                            "id": "timeframe",
                            "displayName": "timeframe",
                            "required": False,
                            "defaultMatch": False,
                            "display": True,
                            "canBeUsedToMatch": True,
                            "type": "string",
                            "removed": False
                        },
                        {
                            "id": "category",
                            "displayName": "category",
                            "required": False,
                            "defaultMatch": False,
                            "display": True,
                            "canBeUsedToMatch": True,
                            "type": "string",
                            "removed": False
                        },
                        {
                            "id": "search_term",
                            "displayName": "search_term",
                            "required": False,
                            "defaultMatch": False,
                            "display": True,
                            "canBeUsedToMatch": True,
                            "type": "string",
                            "removed": False
                        },
                        {
                            "id": "user_id",
                            "displayName": "user_id",
                            "required": False,
                            "defaultMatch": False,
                            "display": True,
                            "canBeUsedToMatch": True,
                            "type": "string",
                            "removed": False
                        }
                    ],
                    "attemptToConvertTypes": False,
                    "convertFieldsToString": False
                }
            },
            "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
            "typeVersion": 2.2,
            "position": [ -2800, -100 ],
            "id": "get-fin-sum-tool-node",
            "name": "Get Financial Summary"
        }
        
        # User ID mapping is different for Telegram trigger vs Webhook trigger
        if "Telegram Trigger" in str(data):
            new_node["parameters"]["workflowInputs"]["value"]["user_id"] = "9d9cb047-85d3-4f2e-aa9d-bc618577342f" # Hardcoded user_id for telegram as seen in Log Finances.json

        data['nodes'].append(new_node)

    # 3. Add connection
    if 'Get Financial Summary' not in data.get('connections', {}):
        data['connections']['Get Financial Summary'] = {
            "ai_tool": [
                [
                    {
                        "node": "AI Agent",
                        "type": "ai_tool",
                        "index": 0
                    }
                ]
            ]
        }
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

print("Updating web chat workflow")
update_workflow('n8n/n8n-web-chat-workflow.json')

print("Updating main workflow")
update_workflow('n8n/n8n-workflow.json')

import json

try:
    with open('postman_collection.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    def search_items(items):
        for item in items:
            if 'item' in item:
                search_items(item['item'])
            
            if 'request' in item:
                name = item.get('name', '').lower()
                url = item['request'].get('url', {})
                if isinstance(url, dict):
                    raw_url = url.get('raw', '')
                else:
                    raw_url = url
                
                if 'payout' in name or 'withdraw' in name or 'payout' in str(raw_url) or 'withdraw' in str(raw_url):
                    print(f"--- Found Request: {item['name']} ---")
                    print(f"URL: {raw_url}")
                    print(f"Method: {item['request']['method']}")
                    if 'body' in item['request']:
                        print(f"Body: {json.dumps(item['request']['body'], indent=2)}")
                    print("--------------------------------\\n")

    if 'item' in data:
        search_items(data['item'])
    else:
        print("No items found in collection")

except Exception as e:
    print(f"Error: {e}")

from app.infra.db import get_db, ImportTask
import json

db = next(get_db())
tasks = db.query(ImportTask).order_by(ImportTask.created_at.desc()).limit(5).all()

print(f'Found {len(tasks)} recent import tasks:\n')

for task in tasks:
    print(f'ID: {task.id}')
    print(f'Status: {task.status}')
    print(f'Created SKU ID: {task.created_sku_id}')
    print(f'parsed_result type: {type(task.parsed_result)}')
    if task.parsed_result:
        print('parsed_result content:')
        print(json.dumps(task.parsed_result, indent=2, ensure_ascii=False))
    print('-' * 80)
    print()

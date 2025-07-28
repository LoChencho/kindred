def serialize_row(row):
    d = dict(row)
    if 'user_id' in d and d['user_id'] is not None:
        d['user_id'] = str(d['user_id'])
    return d

def generate_title(content: str) -> str:
    first_sentence = content.strip().split('.')[0]
    if len(first_sentence) > 60:
        return first_sentence[:57].rstrip() + "..."
    return first_sentence

def generate_date(content: str) -> str:
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d")

def normalize_name(name):
    return name.strip().lower().replace(' ', '_') 
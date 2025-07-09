import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='appfolder/.env')
DATABASE_URL = os.getenv('SUPABASE_DB_URL')

async def check_and_fix_duplicates():
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Check for duplicate IDs
    duplicates = await conn.fetch('''
        SELECT id, COUNT(*) as count 
        FROM stories 
        GROUP BY id 
        HAVING COUNT(*) > 1
    ''')
    
    if duplicates:
        print(f"Found {len(duplicates)} duplicate IDs:")
        for dup in duplicates:
            print(f"ID {dup['id']} appears {dup['count']} times")
        
        # Get all stories with duplicate IDs
        for dup in duplicates:
            stories = await conn.fetch('SELECT * FROM stories WHERE id = $1 ORDER BY id', dup['id'])
            print(f"\nStories with ID {dup['id']}:")
            for i, story in enumerate(stories):
                print(f"  {i+1}. Title: {story['title']}, Content: {story['content'][:50]}...")
        
        # Fix by reassigning IDs
        print("\nFixing duplicate IDs...")
        all_stories = await conn.fetch('SELECT * FROM stories ORDER BY id')
        
        # Create a new sequence starting from the highest ID + 1
        max_id = max(story['id'] for story in all_stories) if all_stories else 0
        new_id = max_id + 1
        
        # Find stories that need new IDs
        seen_ids = set()
        stories_to_update = []
        
        for story in all_stories:
            if story['id'] in seen_ids:
                # This is a duplicate, assign new ID
                stories_to_update.append((story['id'], new_id))
                new_id += 1
            else:
                seen_ids.add(story['id'])
        
        # Update the stories with new IDs
        for old_id, new_id in stories_to_update:
            await conn.execute('UPDATE stories SET id = $1 WHERE id = $2', new_id, old_id)
            print(f"Updated story ID from {old_id} to {new_id}")
        
        # Reset the sequence to start after the highest ID
        await conn.execute('ALTER SEQUENCE stories_id_seq RESTART WITH $1', new_id)
        print(f"Reset sequence to start from {new_id}")
        
    else:
        print("No duplicate IDs found!")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_and_fix_duplicates()) 
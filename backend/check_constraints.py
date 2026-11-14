"""Check all constraints on the users table in Supabase."""
from app.database import open_pool, close_pool, fetch_all

def check():
    print("Connecting...")
    open_pool()
    try:
        # 1. All check constraints on 'users' table
        constraints = fetch_all("""
            SELECT conname, pg_get_constraintdef(oid) AS definition
            FROM pg_constraint
            WHERE conrelid = 'public.users'::regclass
              AND contype = 'c'
        """)
        print("\n=== CHECK CONSTRAINTS ON users TABLE ===")
        for c in constraints:
            print(f"  {c['conname']}: {c['definition']}")

        # 2. All distinct values currently in role column
        roles = fetch_all("SELECT DISTINCT role, COUNT(*) as cnt FROM users GROUP BY role")
        print("\n=== CURRENT DISTINCT role VALUES ===")
        for r in roles:
            print(f"  role='{r['role']}' → {r['cnt']} user(s)")

        # 3. All distinct values in user_type column
        types = fetch_all("SELECT DISTINCT user_type, COUNT(*) as cnt FROM users GROUP BY user_type")
        print("\n=== CURRENT DISTINCT user_type VALUES ===")
        for t in types:
            print(f"  user_type='{t['user_type']}' → {t['cnt']} user(s)")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        close_pool()
        print("\nDone.")

if __name__ == "__main__":
    check()


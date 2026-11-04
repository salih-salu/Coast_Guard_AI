
from app.database import open_pool, close_pool, fetch_all, fetch_one


def run_test():
    print("Connecting to Supabase...")
    open_pool()

    try:
        # 1. Test database connectivity
        res = fetch_one("SELECT NOW() AS current_time")
        print(f"Connected! Database Time: {res['current_time']}")

        # 2. Find admin-related tables
        tables = fetch_all("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
              AND (
                  table_name ILIKE '%admin%'
                  OR table_name ILIKE '%role%'
                  OR table_name ILIKE '%permission%'
                  OR table_name ILIKE '%setting%'
                  OR table_name ILIKE '%user%'
                  OR table_name ILIKE '%guard%'
                  OR table_name ILIKE '%location%'
                  OR table_name ILIKE '%alert%'
                  OR table_name ILIKE '%report%'
              )
            ORDER BY table_name
        """)

        print("\n========== ADMIN RELATED TABLES & COLUMNS ==========")

        if not tables:
            print("No matching tables found.")

        for table in tables:
            table_name = table['table_name']

            print(f"\nTable: {table_name}")
            print("-" * 45)

            # 3. Get column names
            columns = fetch_all("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))

            for column in columns:
                print(f"  - {column['column_name']} ({column['data_type']})")

    except Exception as e:
        print(f"\nDatabase Error: {e}")

    finally:
        close_pool()
        print("\nDatabase connection closed.")


if __name__ == "__main__":
    run_test()

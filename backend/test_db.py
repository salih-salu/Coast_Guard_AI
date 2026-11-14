
from app.database import open_pool, close_pool, fetch_all, fetch_one


def run_test():
    print("Connecting to Supabase...")
    open_pool()

    try:
        # 1. Test database connection
        res = fetch_one("SELECT NOW() AS current_time")
        print(f"Connected! Database Time: {res['current_time']}")

        # 2. Fetch all tables from the database
        tables = fetch_all("""
            SELECT
                table_schema,
                table_name,
                table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN (
                'pg_catalog',
                'information_schema'
            )
            ORDER BY table_schema, table_name
        """)

        print("\n========== ALL DATABASE TABLES ==========")

        if tables:
            print(f"Total Tables: {len(tables)}")

            for index, table in enumerate(tables, start=1):
                print(f"\nTable {index}:")
                print(f"  Schema: {table['table_schema']}")
                print(f"  Name: {table['table_name']}")
                print(f"  Type: {table['table_type']}")
        else:
            print("No tables found.")

    except Exception as e:
        print(f"\nDatabase Error: {e}")

    finally:
        close_pool()
        print("\nDatabase connection closed.")


if __name__ == "__main__":
    run_test()

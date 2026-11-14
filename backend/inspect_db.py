from app.database import open_pool, close_pool, fetch_all

def run():
    open_pool()
    try:
        tables = fetch_all("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        print("TABLES:", [t['table_name'] for t in tables])
        
        # also inspect incidents columns
        cols = fetch_all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='incidents'")
        print("INCIDENTS COLS:", [(c['column_name'], c['data_type']) for c in cols])
        
        # check incident_updates columns
        up_cols = fetch_all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='incident_updates'")
        print("INCIDENT_UPDATES COLS:", [(c['column_name'], c['data_type']) for c in up_cols])
    finally:
        close_pool()

if __name__ == '__main__':
    run()


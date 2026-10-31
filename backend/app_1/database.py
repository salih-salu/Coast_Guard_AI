from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from . import config

pool = ConnectionPool(
    conninfo=make_conninfo(
        host=config.DB_HOST,
        port=config.DB_PORT,
        dbname=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
    ),
    kwargs={"row_factory": dict_row},  # rows come back as dictionaries
    min_size=1,
    max_size=10,
    open=False,
)


def open_pool():
    pool.open(wait=True, timeout=10)


def close_pool():
    pool.close()


def fetch_all(sql, params=None):
    with pool.connection() as conn:
        return conn.execute(sql, params).fetchall()


def fetch_one(sql, params=None):
    with pool.connection() as conn:
        return conn.execute(sql, params).fetchone()
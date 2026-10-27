import pymysql
import queue
import threading
from contextlib import contextmanager
from backend.config import config

class MySQLConnectionPool:
    def __init__(self, max_connections=12):
        self.max_connections = max_connections
        self._pool = queue.Queue(maxsize=max_connections)
        self._created_count = 0
        self._lock = threading.Lock()

    def _create_new_connection(self):
        return pymysql.connect(
            host=config.MYSQL_HOST,
            port=config.MYSQL_PORT,
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
            database=config.MYSQL_DATABASE,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
            charset="utf8mb4",
            connect_timeout=5
        )

    def get_connection(self):
        try:
            conn = self._pool.get_nowait()
            try:
                conn.ping(reconnect=True)
                return conn
            except Exception:
                try:
                    conn.close()
                except Exception:
                    pass
                return self._create_new_connection()
        except queue.Empty:
            with self._lock:
                if self._created_count < self.max_connections:
                    self._created_count += 1
                    return self._create_new_connection()
            return self._pool.get(timeout=10)

    def return_connection(self, conn):
        if conn is None:
            return
        try:
            self._pool.put_nowait(conn)
        except queue.Full:
            try:
                conn.close()
            except Exception:
                pass

db_pool = MySQLConnectionPool(max_connections=12)

def get_connection():
    return db_pool.get_connection()

@contextmanager
def get_db():
    conn = db_pool.get_connection()
    try:
        yield conn
    finally:
        db_pool.return_connection(conn)

def fetch_one(sql, params=None):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()

def fetch_all(sql, params=None):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()

def execute(sql, params=None):
    with get_db() as conn:
        with conn.cursor() as cur:
            rows = cur.execute(sql, params or ())
            return cur.lastrowid, rows

def execute_many(sql, param_list):
    with get_db() as conn:
        with conn.cursor() as cur:
            rows = cur.executemany(sql, param_list)
            return rows

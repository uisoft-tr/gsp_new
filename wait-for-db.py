#!/usr/bin/env python3
import os
import sys
import time
import psycopg2
from psycopg2 import OperationalError

def wait_for_db():
    """PostgreSQL veritabanının hazır olmasını bekler"""
    db_name = os.environ.get('DB_NAME', 'sulama_db')
    db_user = os.environ.get('DB_USER', 'postgres')
    db_password = os.environ.get('DB_PASSWORD', 'postgres123')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')
    
    max_attempts = 30
    attempt = 0
    
    print(f"PostgreSQL veritabanı bekleniyor: {db_host}:{db_port}")
    
    while attempt < max_attempts:
        try:
            connection = psycopg2.connect(
                database=db_name,
                user=db_user,
                password=db_password,
                host=db_host,
                port=db_port
            )
            connection.close()
            print("✅ PostgreSQL hazır!")
            return True
        except OperationalError:
            attempt += 1
            print(f"⏳ PostgreSQL bekleniyor... ({attempt}/{max_attempts})")
            time.sleep(2)
    
    print("❌ PostgreSQL bağlantısı kurulamadı!")
    return False

if __name__ == "__main__":
    if not wait_for_db():
        sys.exit(1) 
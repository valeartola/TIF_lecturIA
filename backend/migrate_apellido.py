"""
Migración: agrega columna 'apellido' a la tabla usuario.
Ejecutar UNA sola vez: python -m backend.migrate_apellido
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "lecturia.db")

def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Verificar si la columna ya existe
    cur.execute("PRAGMA table_info(usuario)")
    columnas = [row[1] for row in cur.fetchall()]

    if "apellido" in columnas:
        print("La columna 'apellido' ya existe. Nada que hacer.")
    else:
        cur.execute("ALTER TABLE usuario ADD COLUMN apellido TEXT")
        conn.commit()
        print("✓ Columna 'apellido' agregada correctamente.")

    conn.close()

if __name__ == "__main__":
    run()
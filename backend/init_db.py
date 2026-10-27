import sys
import json
import pymysql
from backend.config import config
from backend.db import get_connection
from backend.seed_data import seed_database

def run_migrations():
    print("[INFO] Starting non-destructive database migrations on ipfha_db...")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1. Create password_resets table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX(token_hash),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            print("[OK] password_resets table checked/created.")

            # 2. Add columns to profiles if missing
            cur.execute("DESCRIBE profiles;")
            existing_cols = {col["Field"] for col in cur.fetchall()}
            
            profile_columns = [
                ("fitness_level", "VARCHAR(50) DEFAULT 'Beginner'"),
                ("preferred_duration", "INT DEFAULT 30"),
                ("sleep_duration_hours", "DECIMAL(4,2) DEFAULT 7.50"),
                ("water_intake_target_ml", "INT DEFAULT 2500"),
            ]
            for col_name, col_def in profile_columns:
                if col_name not in existing_cols:
                    cur.execute(f"ALTER TABLE profiles ADD COLUMN `{col_name}` {col_def};")
                    print(f"[OK] Added column `{col_name}` to profiles.")

            # 3. Add columns to workouts if missing
            cur.execute("DESCRIBE workouts;")
            existing_workout_cols = {col["Field"] for col in cur.fetchall()}

            workout_columns = [
                ("description", "TEXT NULL"),
                ("difficulty", "VARCHAR(30) DEFAULT 'Beginner'"),
                ("duration_min", "INT DEFAULT 20"),
                ("target_muscles", "VARCHAR(150) DEFAULT 'Full Body'"),
                ("equipment_needed", "VARCHAR(100) DEFAULT 'No Equipment'"),
                ("video_id", "VARCHAR(100) DEFAULT ''"),
                ("exercise_steps_json", "JSON NULL"),
            ]
            for col_name, col_def in workout_columns:
                if col_name not in existing_workout_cols:
                    cur.execute(f"ALTER TABLE workouts ADD COLUMN `{col_name}` {col_def};")
                    print(f"[OK] Added column `{col_name}` to workouts.")

            # 4. Create workout_completions table if missing
            cur.execute("""
            CREATE TABLE IF NOT EXISTS workout_completions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                workout_id INT NULL,
                workout_name VARCHAR(150) NOT NULL,
                duration_min INT NOT NULL,
                calories_burned DECIMAL(6,2) NOT NULL,
                exercises_completed INT NOT NULL DEFAULT 1,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                log_date DATE NOT NULL,
                INDEX(user_id),
                INDEX(log_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            print("[OK] workout_completions table checked/created.")

            # 5. Create daily_plan_checklist table if missing
            cur.execute("""
            CREATE TABLE IF NOT EXISTS daily_plan_checklist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                plan_date DATE NOT NULL,
                meal_type ENUM('Breakfast','Lunch','Dinner','Snacks') NOT NULL,
                food_id INT NULL,
                food_name VARCHAR(150) NOT NULL,
                serving VARCHAR(80) NOT NULL,
                calories DECIMAL(6,2) NOT NULL,
                protein_g DECIMAL(6,2) NOT NULL,
                carbs_g DECIMAL(6,2) NOT NULL,
                fat_g DECIMAL(6,2) NOT NULL,
                is_consumed TINYINT(1) DEFAULT 0,
                swapped_from_id INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX(user_id),
                INDEX(plan_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            print("[OK] daily_plan_checklist table checked/created.")

        print("[SUCCESS] All database structure checks completed.")
    finally:
        conn.close()

    # Now run seeder
    seed_database()

if __name__ == "__main__":
    run_migrations()

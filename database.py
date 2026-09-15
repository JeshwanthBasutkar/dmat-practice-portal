import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), 'dmat_game.db')

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('PRAGMA journal_mode=WAL;')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                puzzles_solved INTEGER DEFAULT 0,
                total_attempts INTEGER DEFAULT 0,
                streak INTEGER DEFAULT 0,
                best_streak INTEGER DEFAULT 0,
                score INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_name TEXT NOT NULL,
                rating INTEGER,
                comment TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

def add_comment(user_name, rating, comment):
    user_name = (user_name or '').strip() or "Anonymous Candidate"
    comment = (comment or '').strip()
    
    validated_rating = None
    if rating is not None and rating != '' and rating != 0 and str(rating) != '0':
        try:
            r_val = int(rating)
            if 1 <= r_val <= 5:
                validated_rating = r_val
            else:
                return False, "Rating must be between 1 and 5 stars."
        except (ValueError, TypeError):
            return False, "Invalid rating value."

    if validated_rating is None and not comment:
        return False, "Please provide at least a star rating or a comment."

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO comments (user_name, rating, comment) VALUES (?, ?, ?)", (user_name, validated_rating, comment))
            conn.commit()
            return True, "Feedback submitted successfully!"
    except Exception as e:
        return False, f"Database error: {str(e)}"

def get_comments():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, user_name, rating, comment, strftime('%Y-%m-%d %H:%M', created_at) as created_at FROM comments ORDER BY id DESC")
        rows = cursor.fetchall()
        comments = [dict(r) for r in rows]
        
        total = len(comments)
        rated_comments = [c for c in comments if c['rating'] is not None]
        rating_count = len(rated_comments)
        if rating_count > 0:
            avg_rating = round(sum(c['rating'] for c in rated_comments) / rating_count, 1)
        else:
            avg_rating = 0.0
            
        return {
            "comments": comments,
            "total_count": total,
            "rating_count": rating_count,
            "avg_rating": avg_rating
        }

def register_user(username, password):
    username = username.strip()
    if not username or not password:
        return False, "Username and password are required."
    if len(username) < 3:
        return False, "Username must be at least 3 characters."
    if len(password) < 4:
        return False, "Password must be at least 4 characters."
        
    pw_hash = generate_password_hash(password)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, pw_hash))
            user_id = cursor.lastrowid
            cursor.execute("INSERT INTO stats (user_id) VALUES (?)", (user_id,))
            conn.commit()
            return True, {"id": user_id, "username": username}
    except sqlite3.IntegrityError:
        return False, "Username already exists. Please choose another."
    except Exception as e:
        return False, f"Database error: {str(e)}"

def verify_user(username, password):
    username = username.strip()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username,))
        user = cursor.fetchone()
        if user and check_password_hash(user['password_hash'], password):
            return True, {"id": user['id'], "username": user['username']}
        return False, "Invalid username or password."

def get_user_stats(user_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.*, u.username 
            FROM stats s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.user_id = ?
        """, (user_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

def update_user_stats(user_id, is_correct):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM stats WHERE user_id = ?", (user_id,))
        stats = cursor.fetchone()
        if not stats:
            cursor.execute("INSERT INTO stats (user_id) VALUES (?)", (user_id,))
            cursor.execute("SELECT * FROM stats WHERE user_id = ?", (user_id,))
            stats = cursor.fetchone()
            
        total_attempts = stats['total_attempts'] + 1
        if is_correct:
            puzzles_solved = stats['puzzles_solved'] + 1
            streak = stats['streak'] + 1
            best_streak = max(stats['best_streak'], streak)
            # Award exactly 5 points per question solved (+ 1 point streak bonus)
            score = stats['score'] + 5 + streak
        else:
            puzzles_solved = stats['puzzles_solved']
            streak = 0
            best_streak = stats['best_streak']
            score = stats['score']
            
        cursor.execute("""
            UPDATE stats 
            SET puzzles_solved = ?, total_attempts = ?, streak = ?, best_streak = ?, score = ?
            WHERE user_id = ?
        """, (puzzles_solved, total_attempts, streak, best_streak, score, user_id))
        conn.commit()
        
        return {
            "puzzles_solved": puzzles_solved,
            "total_attempts": total_attempts,
            "streak": streak,
            "best_streak": best_streak,
            "score": score
        }

def get_leaderboard(limit=10):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.username, s.score, s.puzzles_solved, s.best_streak 
            FROM stats s 
            JOIN users u ON s.user_id = u.id 
            ORDER BY s.score DESC, s.puzzles_solved DESC 
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

if __name__ == '__main__':
    init_db()
    print("Database updated and initialized successfully with 5-point reward system.")

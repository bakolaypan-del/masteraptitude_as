import os
import sys
import json
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Error: The 'psycopg2-binary' package is not installed.")
    print("Please run: pip install psycopg2-binary")
    sys.exit(1)

# Connection string with pooler host and username
DB_URI = "postgresql://postgres.jwntggzietgsiazjlkbk:Sumankolay%401995@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

def get_connection():
    return psycopg2.connect(DB_URI)

def to_epoch_ms(val):
    if not val:
        return None
    if isinstance(val, (int, float)):
        return int(val)
    if isinstance(val, str):
        try:
            val = val.replace("Z", "")
            dt = datetime.fromisoformat(val)
            return int(dt.timestamp() * 1000)
        except ValueError:
            try:
                return int(val)
            except ValueError:
                return None
    return None

def parse_time_taken(val):
    if not val:
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    if isinstance(val, str):
        if ":" in val:
            try:
                parts = val.split(":")
                if len(parts) == 2:
                    return int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            except ValueError:
                return 0
        try:
            return int(val)
        except ValueError:
            return 0
    return 0

def create_tables(conn):
    print("Setting up SQL schemas in Supabase...")
    cur = conn.cursor()
    
    schema_sql = """
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        phone_number VARCHAR(50),
        role VARCHAR(50) DEFAULT 'user',
        total_tests_taken INTEGER DEFAULT 0,
        cumulative_score NUMERIC(10,2) DEFAULT 0.00,
        global_rank INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        last_test_at BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tests (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        topic VARCHAR(255),
        subject_name VARCHAR(100),
        description TEXT,
        category VARCHAR(255),
        test_type VARCHAR(100),
        duration INTEGER DEFAULT 30,
        marks_per_correct NUMERIC(5,2) DEFAULT 1.00,
        negative_marks NUMERIC(5,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(128) PRIMARY KEY,
        test_id VARCHAR(128) REFERENCES tests(id) ON DELETE CASCADE,
        topic VARCHAR(255),
        q_no INTEGER,
        question_text TEXT NOT NULL,
        options TEXT[],
        image_url TEXT,
        correct_answer TEXT,
        equation_latex TEXT,
        solution TEXT,
        explanation TEXT
    );

    CREATE TABLE IF NOT EXISTS results (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        test_id VARCHAR(128) REFERENCES tests(id) ON DELETE CASCADE,
        test_title VARCHAR(255),
        score NUMERIC(10,2),
        correct_answers INTEGER,
        wrong_answers INTEGER,
        unattempted INTEGER,
        accuracy NUMERIC(5,2),
        time_taken INTEGER,
        attempt_number INTEGER,
        is_first_attempt BOOLEAN,
        submitted_during_live BOOLEAN DEFAULT FALSE,
        timestamp BIGINT,
        user_answers JSONB,
        question_times JSONB
    );

    CREATE TABLE IF NOT EXISTS typing_tests (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255),
        duration INTEGER,
        difficulty VARCHAR(50),
        paragraph TEXT,
        language VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS typing_results (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        test_id VARCHAR(128) REFERENCES typing_tests(id) ON DELETE CASCADE,
        attempt_no INTEGER,
        wpm NUMERIC(5,2),
        accuracy NUMERIC(5,2),
        errors INTEGER,
        time_taken_minutes NUMERIC(5,2),
        created_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS custom_categories (
        id VARCHAR(128) PRIMARY KEY,
        category_name VARCHAR(255),
        category_type VARCHAR(100),
        icon VARCHAR(100),
        color_theme VARCHAR(100),
        status INTEGER DEFAULT 1,
        created_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS mock_question_analysis (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        test_id VARCHAR(128) REFERENCES tests(id) ON DELETE CASCADE,
        question_id VARCHAR(128) REFERENCES questions(id) ON DELETE CASCADE,
        selected_answer TEXT,
        correct_answer TEXT,
        is_correct BOOLEAN,
        time_taken_seconds INTEGER,
        attempted_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS carousel (
        id VARCHAR(128) PRIMARY KEY,
        link TEXT,
        priority INTEGER,
        badge VARCHAR(255),
        author_id VARCHAR(128),
        created_at BIGINT,
        image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS affairs (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255),
        slug VARCHAR(255),
        date VARCHAR(50),
        description TEXT,
        status VARCHAR(50),
        pin_to_homepage BOOLEAN,
        link TEXT,
        tags TEXT[]
    );

    CREATE TABLE IF NOT EXISTS study_notes (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255),
        link TEXT,
        thumbnail_url TEXT,
        status VARCHAR(50),
        author_id VARCHAR(128),
        view_count INTEGER,
        created_at BIGINT,
        sections JSONB
    );

    CREATE TABLE IF NOT EXISTS videos (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255),
        link TEXT,
        subject VARCHAR(100),
        author_id VARCHAR(128),
        created_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS paid_mock_batches (
        id VARCHAR(128) PRIMARY KEY,
        exam_name VARCHAR(255),
        description TEXT,
        validity VARCHAR(100),
        price NUMERIC(10,2),
        enrolled_count INTEGER,
        features TEXT[],
        is_popular BOOLEAN,
        created_at BIGINT
    );

    CREATE TABLE IF NOT EXISTS student_reviews (
        id VARCHAR(128) PRIMARY KEY,
        full_name VARCHAR(255),
        rating INTEGER,
        review_text TEXT,
        category VARCHAR(100),
        review_link_id VARCHAR(128),
        featured BOOLEAN,
        show_homepage BOOLEAN,
        created_at BIGINT
    );
    """
    cur.execute(schema_sql)
    conn.commit()
    cur.close()
    print("[OK] Schemas checked/created successfully.")

def import_users(conn):
    print("Importing profiles -> users (batch)...")
    file_path = "migration_data/profiles.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        profiles = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO users (id, name, email, phone_number, role, total_tests_taken, cumulative_score, global_rank, status, last_test_at)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone_number = EXCLUDED.phone_number,
            total_tests_taken = EXCLUDED.total_tests_taken,
            cumulative_score = EXCLUDED.cumulative_score,
            global_rank = EXCLUDED.global_rank;
    """
    
    args = [
        (
            uid,
            data.get("name"),
            data.get("email") or data.get("studentEmail"),
            data.get("phoneNumber"),
            data.get("role", "user"),
            data.get("totalTestsTaken", 0),
            data.get("cumulativeScore", 0.00),
            data.get("globalRank", 0),
            data.get("status", "active"),
            to_epoch_ms(data.get("lastTestAt"))
        )
        for uid, data in profiles.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} users.")

def import_tests(conn):
    print("Importing tests (batch)...")
    file_path = "migration_data/tests.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        tests = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO tests (id, title, topic, subject_name, description, category, test_type, duration, marks_per_correct, negative_marks, is_active, created_at)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            topic = EXCLUDED.topic,
            category = EXCLUDED.category;
    """
    
    args = [
        (
            tid,
            data.get("title", "Mock Test"),
            data.get("topic"),
            data.get("subjectName"),
            data.get("description"),
            data.get("category"),
            data.get("testType"),
            data.get("duration", 30),
            data.get("marksPerCorrect", 1.00),
            data.get("negativeMarks", 0.00),
            data.get("isActive", True),
            to_epoch_ms(data.get("createdAt"))
        )
        for tid, data in tests.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} tests.")

def import_questions(conn, valid_tests):
    print("Importing questions (batch)...")
    file_path = "migration_data/questions.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        questions = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO questions (id, test_id, topic, q_no, question_text, options, image_url, correct_answer, equation_latex, solution, explanation)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = []
    for qid, data in questions.items():
        test_id = data.get("testId")
        if not test_id or test_id not in valid_tests:
            continue
        args.append((
            qid,
            test_id,
            data.get("topic"),
            data.get("qNo"),
            data.get("questionText", ""),
            data.get("options", []),
            data.get("imageUrl"),
            data.get("correctAnswer"),
            data.get("equationLatex"),
            data.get("solution"),
            data.get("explanation")
        ))
        
    if args:
        execute_values(cur, query, args)
        conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} questions.")

def import_results(conn, valid_users, valid_tests):
    print("Importing results (batch)...")
    file_path = "migration_data/results.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        results = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO results (id, user_id, test_id, test_title, score, correct_answers, wrong_answers, unattempted, accuracy, time_taken, attempt_number, is_first_attempt, submitted_during_live, timestamp, user_answers, question_times)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = []
    for rid, data in results.items():
        uid = data.get("userId")
        tid = data.get("testId")
        if not uid or not tid or uid not in valid_users or tid not in valid_tests:
            continue
        args.append((
            rid,
            uid,
            tid,
            data.get("testTitle"),
            data.get("score"),
            data.get("correctAnswers"),
            data.get("wrongAnswers"),
            data.get("unattempted"),
            data.get("accuracy"),
            parse_time_taken(data.get("timeTaken")),
            data.get("attemptNumber"),
            data.get("isFirstAttempt"),
            data.get("submittedDuringLive", False),
            to_epoch_ms(data.get("timestamp")),
            json.dumps(data.get("userAnswers", {})),
            json.dumps(data.get("questionTimes", {}))
        ))
        
    if args:
        execute_values(cur, query, args)
        conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} results.")

def import_typing_tests(conn):
    print("Importing typing tests (batch)...")
    file_path = "migration_data/typing_tests.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        tests = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO typing_tests (id, title, duration, difficulty, paragraph, language, is_active, created_at)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = [
        (
            tid,
            data.get("title"),
            data.get("duration"),
            data.get("difficulty"),
            data.get("paragraph"),
            data.get("language"),
            data.get("isActive", True),
            to_epoch_ms(data.get("createdAt"))
        )
        for tid, data in tests.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} typing tests.")

def import_typing_results(conn, valid_users, valid_typing_tests):
    print("Importing typing results (batch)...")
    file_path = "migration_data/typing_results.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        results = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO typing_results (id, user_id, test_id, attempt_no, wpm, accuracy, errors, time_taken_minutes, created_at)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = []
    for rid, data in results.items():
        uid = data.get("userId") or data.get("student_id")
        tid = data.get("testId") or data.get("test_id")
        if not uid or not tid or uid not in valid_users or tid not in valid_typing_tests:
            continue
        args.append((
            rid,
            uid,
            tid,
            data.get("attemptNo") or data.get("attempt_no", 1),
            data.get("wpm", 0.00),
            data.get("accuracy", 0.00),
            data.get("errors", 0),
            data.get("timeTakenMinutes", 0.00),
            to_epoch_ms(data.get("createdAt"))
        ))
        
    if args:
        execute_values(cur, query, args)
        conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} typing results.")

def import_custom_categories(conn):
    print("Importing custom categories (batch)...")
    file_path = "migration_data/custom_categories.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        cats = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO custom_categories (id, category_name, category_type, icon, color_theme, status, created_at)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = [
        (
            cid,
            data.get("categoryName"),
            data.get("categoryType"),
            data.get("icon"),
            data.get("colorTheme"),
            data.get("status", 1),
            to_epoch_ms(data.get("createdAt"))
        )
        for cid, data in cats.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} custom categories.")

def import_mock_question_analysis(conn, valid_users, valid_tests, valid_questions):
    print("Importing mock question analysis (batch)...")
    file_path = "migration_data/mock_question_analysis.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        analysis = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO mock_question_analysis (id, user_id, test_id, question_id, selected_answer, correct_answer, is_correct, time_taken_seconds, attempted_at)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = []
    for aid, data in analysis.items():
        uid = data.get("userId") or data.get("studentId")
        tid = data.get("testId")
        qid = data.get("questionId")
        if not uid or not tid or not qid or uid not in valid_users or tid not in valid_tests or qid not in valid_questions:
            continue
        args.append((
            aid,
            uid,
            tid,
            qid,
            data.get("selectedAnswer"),
            data.get("correctAnswer"),
            data.get("isCorrect"),
            parse_time_taken(data.get("timeTakenSeconds")),
            to_epoch_ms(data.get("attemptedAt"))
        ))
        
    if args:
        # Perform chunked bulk inserts to prevent single massive payloads
        chunk_size = 1000
        for i in range(0, len(args), chunk_size):
            chunk = args[i:i + chunk_size]
            execute_values(cur, query, chunk)
            print(f"  Batch inserted {i + len(chunk)} / {len(args)} analysis records...")
        conn.commit()
        
    cur.close()
    print(f"[OK] Imported {len(args)} mock question analysis records.")

def import_carousel(conn):
    print("Importing carousel (batch)...")
    file_path = "migration_data/carousel.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        carousel = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO carousel (id, link, priority, badge, author_id, created_at, image_url)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = [
        (
            cid,
            data.get("link"),
            data.get("priority"),
            data.get("badge"),
            data.get("authorId"),
            to_epoch_ms(data.get("createdAt")),
            data.get("imageUrl")
        )
        for cid, data in carousel.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} carousel documents.")

def import_affairs(conn):
    print("Importing current affairs (batch)...")
    file_path = "migration_data/affairs.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        affairs = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO affairs (id, title, slug, date, description, status, pin_to_homepage, link, tags)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = [
        (
            aid,
            data.get("title"),
            data.get("slug"),
            data.get("date"),
            data.get("description"),
            data.get("status"),
            data.get("pinToHomepage"),
            data.get("link"),
            data.get("tags", [])
        )
        for aid, data in affairs.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} current affairs.")

def import_study_notes(conn):
    print("Importing study notes (batch)...")
    file_path = "migration_data/study_notes.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        notes = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO study_notes (id, title, link, thumbnail_url, status, author_id, view_count, created_at, sections)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = [
        (
            nid,
            data.get("title"),
            data.get("link"),
            data.get("thumbnailUrl"),
            data.get("status"),
            data.get("authorId"),
            data.get("viewCount", 0),
            to_epoch_ms(data.get("createdAt")),
            json.dumps(data.get("sections", {}))
        )
        for nid, data in notes.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} study notes.")

def import_videos(conn):
    print("Importing videos (batch)...")
    file_path = "migration_data/videos.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        videos = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO videos (id, title, link, subject, author_id, created_at)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = [
        (
            vid,
            data.get("title"),
            data.get("link"),
            data.get("subject"),
            data.get("authorId"),
            to_epoch_ms(data.get("createdAt"))
        )
        for vid, data in videos.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} videos.")

def import_paid_mock_batches(conn):
    print("Importing paid mock batches (batch)...")
    file_path = "migration_data/paid_mock_batches.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        batches = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO paid_mock_batches (id, exam_name, description, validity, price, enrolled_count, features, is_popular, created_at)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = [
        (
            bid,
            data.get("examName"),
            data.get("description"),
            data.get("validity"),
            data.get("price"),
            data.get("enrolledCount", 0),
            data.get("features", []),
            data.get("isPopular", False),
            to_epoch_ms(data.get("createdAt"))
        )
        for bid, data in batches.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} paid mock batches.")

def import_student_reviews(conn):
    print("Importing student reviews (batch)...")
    file_path = "migration_data/student_reviews.json"
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        reviews = json.load(f)

    cur = conn.cursor()
    
    query = """
        INSERT INTO student_reviews (id, full_name, rating, review_text, category, review_link_id, featured, show_homepage, created_at)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """
    
    args = [
        (
            rid,
            data.get("fullName"),
            data.get("rating"),
            data.get("reviewText"),
            data.get("category"),
            data.get("reviewLinkId"),
            data.get("featured", False),
            data.get("showHomepage", False),
            to_epoch_ms(data.get("createdAt"))
        )
        for rid, data in reviews.items()
    ]
    
    execute_values(cur, query, args)
    conn.commit()
    cur.close()
    print(f"[OK] Imported {len(args)} student reviews.")

def main():
    print(f"Connecting to Supabase PostgreSQL...")
    try:
        conn = get_connection()
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    try:
        # Create schemas
        create_tables(conn)
        
        # Primary tables
        import_users(conn)
        import_tests(conn)
        import_typing_tests(conn)
        import_custom_categories(conn)
        import_carousel(conn)
        import_affairs(conn)
        import_study_notes(conn)
        import_videos(conn)
        import_paid_mock_batches(conn)
        import_student_reviews(conn)
        
        # Fetch valid IDs to enforce relational integrity
        cur = conn.cursor()
        cur.execute("SELECT id FROM users")
        valid_users = set(row[0] for row in cur.fetchall())
        
        cur.execute("SELECT id FROM tests")
        valid_tests = set(row[0] for row in cur.fetchall())
        
        cur.execute("SELECT id FROM typing_tests")
        valid_typing_tests = set(row[0] for row in cur.fetchall())
        cur.close()
        
        # Secondary tables (referencing primary tables)
        import_questions(conn, valid_tests)
        
        # Now fetch valid question IDs
        cur = conn.cursor()
        cur.execute("SELECT id FROM questions")
        valid_questions = set(row[0] for row in cur.fetchall())
        cur.close()
        
        import_results(conn, valid_users, valid_tests)
        import_typing_results(conn, valid_users, valid_typing_tests)
        import_mock_question_analysis(conn, valid_users, valid_tests, valid_questions)
        
        print("\n[OK] All database tables and data imported to Supabase successfully!")
    except Exception as e:
        print(f"\nMigration failed during execution: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()
